export class AuthResponseDto {
  user: {
    _id: string;
    email: string;
    firstName: string; // Added to reflect new schema
    lastName: string;  // Added to reflect new schema
    fullName: string;  // Added for convenience (virtual property)
    roles: string[];   // Changed from 'role' (string) to 'roles' (array of strings)
    isVerified: boolean; // Added to reflect new schema
  };
  access_token: string;
}
