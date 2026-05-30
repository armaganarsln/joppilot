import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getAdminProject, projectLabel, PROJECT_ADMIN_EMAILS } from '../config/access';
import type { OperatorProfile, WorkspaceProject } from '../types';

export type AuthProvider = 'email' | 'google';

interface MinimalUser {
  uid: string;
  email: string | null;
}

/**
 * Computes the operator profile for a freshly authenticated user.
 * Allowlisted admins are auto-approved into their workspace; everyone else
 * starts as a pending operator in the workspace they selected at sign-up.
 */
export function resolveOperatorProfile(
  user: MinimalUser,
  selectedProject: WorkspaceProject,
): OperatorProfile {
  const adminProject = getAdminProject(user.email);
  const isAdmin = adminProject !== null;

  return {
    uid: user.uid,
    email: user.email,
    role: isAdmin ? 'admin' : 'operator',
    status: isAdmin ? 'approved' : 'pending',
    project: adminProject ?? selectedProject,
    createdAt: new Date().toISOString(),
  };
}

/** Builds a Firestore "Trigger Email" document notifying admins of a pending operator. */
export function buildApprovalEmail(
  user: MinimalUser,
  project: WorkspaceProject,
  provider: AuthProvider,
) {
  const label = projectLabel(project);
  const providerName = provider === 'google' ? 'Google Authentication' : 'Email / Password';
  const providerColor = provider === 'google' ? '#4285F4' : '#326CB8';

  return {
    to: PROJECT_ADMIN_EMAILS[project],
    message: {
      subject: `[Jöppilot] New Operator Pending Approval: ${user.email}`,
      text:
        `Hello Admin,\n\n` +
        `A new operator (${user.email}) has registered via ${providerName} for the ${label} workspace ` +
        `and is awaiting your authorization.\n\n` +
        `Please log in to the Jöppilot Portal and navigate to Contacts & Users > Approval Queue ` +
        `to approve or decline this request.\n\n` +
        `Best regards,\nJöppli Fleet Management System`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #2D2F3B;">
          <h2 style="color: #326CB8; text-transform: uppercase;">Municipal Workspace Access Request</h2>
          <p>A new operator has registered and is awaiting municipal administrator review:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background-color: #F8F9FA;">
              <td style="padding: 10px; font-weight: bold; border: 1px solid #EDEDED;">Operator ID/Email</td>
              <td style="padding: 10px; border: 1px solid #EDEDED;">${user.email}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; border: 1px solid #EDEDED;">Workspace City</td>
              <td style="padding: 10px; border: 1px solid #EDEDED; text-transform: uppercase; font-weight: bold; color: #326CB8;">${label}</td>
            </tr>
            <tr style="background-color: #F8F9FA;">
              <td style="padding: 10px; font-weight: bold; border: 1px solid #EDEDED;">Provider</td>
              <td style="padding: 10px; border: 1px solid #EDEDED; font-weight: bold; color: ${providerColor};">${providerName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; border: 1px solid #EDEDED;">Status</td>
              <td style="padding: 10px; border: 1px solid #EDEDED; color: #FFCB00; font-weight: bold; text-transform: uppercase;">Awaiting Approval</td>
            </tr>
          </table>
          <p>Please log in to your Jöppilot portal, navigate to the <b>Contacts & Users</b> console, and open the <b>Approval Queue</b> tab to authorize or reject this registration.</p>
          <hr style="border: 0; border-top: 1px solid #EDEDED; margin: 20px 0;" />
          <p style="font-size: 11px; color: #888;">Jöppli Smart Fleet Management Terminal</p>
        </div>
      `,
    },
  };
}

/**
 * Creates the operator profile document and, for pending operators, queues an
 * admin approval email. Returns the resolved profile so callers can branch on
 * the resulting status. Shared by the email-register and Google sign-in flows.
 */
export async function provisionOperator(
  user: MinimalUser,
  selectedProject: WorkspaceProject,
  provider: AuthProvider,
): Promise<OperatorProfile> {
  const profile = resolveOperatorProfile(user, selectedProject);

  await setDoc(doc(db, 'operators', profile.uid), profile);

  if (profile.status === 'pending') {
    await setDoc(
      doc(db, 'mail', `reg_${profile.uid}`),
      buildApprovalEmail(user, profile.project, provider),
    );
  }

  return profile;
}
