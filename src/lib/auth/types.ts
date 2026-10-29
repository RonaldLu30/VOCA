export type AuthMode = "login" | "register";

export type UserIdentity = {
  username: string;
  phone: string;
};

export type StoredAccount = UserIdentity & {
  password: string;
  createdAt: string;
};

export const AUTH_STORAGE_KEY = "wordkiller.auth.account";
export const SESSION_STORAGE_KEY = "wordkiller.auth.session";
