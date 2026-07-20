import { User, type IUser, type UserDocument } from '@/models/user.model';

 // Data-access layer for users — the only place that queries the User model.

export type CreateUserData = Pick<IUser, 'name' | 'email' | 'phone' | 'address' | 'password'>;

export const userRepository = {
  create(data: CreateUserData): Promise<UserDocument> {
    return User.create(data);
  },

  findByEmail(email: string): Promise<UserDocument | null> {
    return User.findOne({ email }).exec();
  },

  // Login path only - includes the password hash and lockout state.
  findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return User.findOne({ email }).select('+password +failedLoginAttempts +lockUntil').exec();
  },

  /** Atomically counts one failed login and returns the new total — $inc keeps
   *  parallel wrong guesses from losing updates. */
  async recordFailedLogin(id: string): Promise<number> {
    const user = await User.findByIdAndUpdate(
      id,
      { $inc: { failedLoginAttempts: 1 } },
      { new: true },
    )
      .select('+failedLoginAttempts')
      .exec();
    return user?.failedLoginAttempts ?? 0;
  },

  async lockAccount(id: string, until: Date): Promise<void> {
    await User.updateOne(
      { _id: id },
      { $set: { lockUntil: until, failedLoginAttempts: 0 } },
    ).exec();
  },

  async clearLoginFailures(id: string): Promise<void> {
    await User.updateOne(
      { _id: id },
      { $unset: { failedLoginAttempts: 1, lockUntil: 1 } },
    ).exec();
  },

  findById(id: string): Promise<UserDocument | null> {
    return User.findById(id).exec();
  },

  findByIdWithPasswordChangedAt(id: string): Promise<UserDocument | null> {
    return User.findById(id).select('+passwordChangedAt').exec();
  },

  findByEmailForReset(email: string): Promise<UserDocument | null> {
    return User.findOne({ email }).select('+passwordResetToken +passwordResetExpires').exec();
  },

  findByValidVerificationTokenHash(tokenHash: string): Promise<UserDocument | null> {
    return User.findOne({
      emailVerificationToken: tokenHash,
      emailVerificationExpires: { $gt: new Date() },
    })
      .select('+emailVerificationToken +emailVerificationExpires')
      .exec();
  },

  /** Matches the hash of an emailed token, only while unexpired. Includes the
   *  current hash and history so the reuse check can run. */
  findByValidResetTokenHash(tokenHash: string): Promise<UserDocument | null> {
    return User.findOne({
      passwordResetToken: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    })
      .select('+passwordResetToken +passwordResetExpires +password +passwordHistory')
      .exec();
  },

  existsByEmail(email: string): Promise<boolean> {
    return User.exists({ email }).then((res) => res !== null);
  },

  async recordLogin(id: string): Promise<void> {
    await User.updateOne({ _id: id }, { $set: { lastLoginAt: new Date() } }).exec();
  },

  // Admin

  /** Everyone, newest first — password stays excluded by its select:false. */
  findAll(): Promise<UserDocument[]> {
    return User.find().sort({ createdAt: -1 }).exec();
  },

  deleteById(id: string): Promise<UserDocument | null> {
    return User.findByIdAndDelete(id).exec();
  },
};
