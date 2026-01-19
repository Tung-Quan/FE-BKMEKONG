export type User = {
  _id: string;
  googleId: string;
  appleId: string | null;
  firstName: string | null;
  lastName: string | null;
  picture: string | null;
  dateOfBirth: string | null;
  email: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  wallet: number;
  isAdmin: boolean;
  profilePicture?: string;
  socialMedia?: {
    facebookUrl?: string;
    facebookName?: string;
    instagramUrl?: string;
    instagramName?: string;
    twitterUrl?: string;
    twitterName?: string;
    linkedInUrl?: string;
    linkedInName?: string;
  };
};

export type calendarChoosingType = {
  type?: string;
};
