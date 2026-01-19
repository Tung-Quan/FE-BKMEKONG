export interface SignInProps {
  onSignIn: (username: string, password: string) => Promise<void>;
  changeToSignUp: () => void;
}
export interface SignUpProps {
  onSignUp: (
    username: string,
    password: string,
    email: string
  ) => Promise<void>;
  changeToSignIn: () => void;
}
