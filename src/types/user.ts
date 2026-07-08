type CurrentUser = {
  id: string;
  isPremium: boolean;
  email: string;
  name: string;

  googleId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  isVerified?: boolean;
};

export type { CurrentUser };
