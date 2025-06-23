export class AuthResponseDto {
  user: {
    _id: string;
    email: string;
    fullName: string;
    role: string;
    clientId?: string;
  };
  access_token: string;
}
