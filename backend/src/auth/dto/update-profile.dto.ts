export class UpdateProfileDto {
  /** Optional new display name */
  fullName?: string;

  /** Optional new birth date (ISO string, e.g. "1990-06-15") */
  birthDate?: string;

  /** Optional new birth time (e.g. "14:30") */
  birthTime?: string;

  /** Optional new birth place */
  birthPlace?: string;

  /**
   * Must be provided together with newPassword.
   * The service will verify this matches the stored hash before updating.
   */
  currentPassword?: string;

  /** New password — requires currentPassword to be valid */
  newPassword?: string;
}
