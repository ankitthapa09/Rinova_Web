import {
  User,
  MAX_SESSIONS,
  type IUser,
  type UserDocument,
  type RefreshSession,
} from '@/models/user.model';

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

  /** $inc so parallel wrong guesses can't lose updates. Returns the new total. */
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

  findByIdWithSessions(id: string): Promise<UserDocument | null> {
    return User.findById(id).select('+passwordChangedAt +refreshSessions').exec();
  },

  /** Adds a session, evicting the oldest past MAX_SESSIONS. */
  async addSession(id: string, session: RefreshSession): Promise<void> {
    await User.updateOne(
      { _id: id },
      {
        $push: {
          refreshSessions: {
            $each: [session],
            $sort: { createdAt: 1 },
            $slice: -MAX_SESSIONS,
          },
        },
      },
    ).exec();
  },

  /**
   * Rotation as a compare-and-swap: only advances if the family is still on
   * `expectedHash`. Two simultaneous refreshes both match the same token, but
   * only the first update finds it — the loser gets false and must not rotate,
   * or the two would diverge and orphan the caller's token.
   */
  async rotateSession(
    id: string,
    family: string,
    expectedHash: string,
    session: RefreshSession,
  ): Promise<boolean> {
    const res = await User.updateOne(
      { _id: id, refreshSessions: { $elemMatch: { family, tokenHash: expectedHash } } },
      {
        $set: {
          'refreshSessions.$.tokenHash': session.tokenHash,
          'refreshSessions.$.previousTokenHash': expectedHash,
          'refreshSessions.$.rotatedAt': new Date(),
          'refreshSessions.$.expiresAt': session.expiresAt,
          'refreshSessions.$.userAgent': session.userAgent,
        },
      },
    ).exec();
    return res.matchedCount > 0;
  },

  /** Logout / reuse — remove one family's session. */
  async removeSessionByFamily(id: string, family: string): Promise<void> {
    await User.updateOne({ _id: id }, { $pull: { refreshSessions: { family } } }).exec();
  },

  /** Reuse detected / logout-everywhere — drop every session. */
  async clearAllSessions(id: string): Promise<void> {
    await User.updateOne({ _id: id }, { $set: { refreshSessions: [] } }).exec();
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

  /** Matches an emailed token's hash, only while unexpired. */
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
