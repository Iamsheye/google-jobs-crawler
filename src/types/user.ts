type CurrentUser = {
  id: string;
  createdAt: string;
  updatedAt: string;
  isPremium: boolean;
  email: string;
  googleId: string;
  name: string;
  isVerified: boolean;

  isLoginAllowed: boolean;
  resetToken: string | null;
  resetTokenExpiry: string | null;
};

export type { CurrentUser };
