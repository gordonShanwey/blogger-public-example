import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  User,
  UserCredential
} from 'firebase/auth';
import { auth } from './firebase';

// Get allowed emails from environment variables
const ALLOWED_EMAILS = import.meta.env.VITE_ALLOWED_EMAILS?.split(',') || [];

class AuthService {
  /**
   * Check if an email is in the whitelist
   */
  private isEmailAllowed(email: string): boolean {
    if (!email) return false;
    return ALLOWED_EMAILS.map((e: string) => e.toLowerCase().trim()).includes(email.toLowerCase().trim());
  }

  /**
   * Register a new user with email and password
   */
  async register(email: string, password: string, displayName: string): Promise<User> {
    try {
      if (!this.isEmailAllowed(email)) {
        throw new Error('This email is not authorized to register.');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Update the user profile with the display name
      await updateProfile(userCredential.user, { displayName });
      return userCredential.user;
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  }

  /**
   * Sign in a user with email and password
   */
  async login(email: string, password: string): Promise<UserCredential> {
    try {
      if (!this.isEmailAllowed(email)) {
        throw new Error('This email is not authorized to access the application.');
      }

      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  }

  /**
   * Sign in a user with Google
   */
  async loginWithGoogle(): Promise<UserCredential> {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Check if the Google account's email is allowed
      if (!this.isEmailAllowed(result.user.email || '')) {
        // If not allowed, sign out the user
        await this.logout();
        throw new Error('This Google account is not authorized to access the application.');
      }
      
      return result;
    } catch (error) {
      console.error('Error logging in with Google:', error);
      throw error;
    }
  }

  /**
   * Sign out the current user
   */
  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  /**
   * Get the current authenticated user
   */
  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /**
   * Listen for authentication state changes
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }

  /**
   * Send a password reset email
   */
  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(displayName: string, photoURL?: string): Promise<void> {
    try {
      const user = this.getCurrentUser();
      if (user) {
        await updateProfile(user, { displayName, photoURL });
      } else {
        throw new Error('No user is currently logged in');
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }
}

export default new AuthService(); 