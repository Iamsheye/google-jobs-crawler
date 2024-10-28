type CurrentUser = {
  id: string;
  isPremium: boolean;
  email: string;
  name: string;

  googleId?: string;
  createdAt?: string;
  updatedAt?: string;
  isVerified?: boolean;

  isLoginAllowed?: boolean;
  resetToken?: string | null;
  resetTokenExpiry?: string | null;
};

export type { CurrentUser };
