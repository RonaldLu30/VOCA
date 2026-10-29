export type AuthMode = "login" | "register";

export type UserIdentity = {
  id: string;
  username: string;
  phone: string | null;
};
