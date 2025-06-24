import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User, UserDocument, UserRole } from './schema/user.schema';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { EmailsService } from 'src/emails/emails.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailsService: EmailsService,
  ) {}

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto): Promise<any> {
    // Destructure the DTO to get individual fields,
    // now including firstName, lastName, phone, and profileUrl.
    // The 'role' field is no longer directly destructured as it's now an array
    // and will be defaulted or explicitly set.
    const {
      email,
      password,
      clientId,
      firstName,
      lastName,
      phone,
      profileUrl,
    } = registerDto;

    try {
      // Check if a user with this email already exists
      const existingUser = await this.userModel.findOne({ email }).exec();
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Hash the password for security before saving
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create a new user instance with updated fields
      const newUser = new this.userModel({
        // Spread the registerDto to include firstName, lastName, phone, profileUrl, and clientId
        ...registerDto,
        password: hashedPassword,
        // Assign default role(s) for new registrations.
        // For general registration, new users are typically 'CUSTOMER'.
        roles: [UserRole.CUSTOMER],
        // New users are not verified by default, email verification flow will handle this.
        isVerified: false,
      });

      // Save the new user to the database
      await newUser.save();

      // Prepare payload for JWT token.
      // The 'role' field is now 'roles' (an array).
      const payload = {
        email: newUser.email,
        sub: newUser._id,
        roles: newUser.roles, // Use the new 'roles' array for the JWT payload
        // clientId: newUser.clientId, // Include clientId if present
      };

      // Send welcome email (don't await to avoid blocking the registration response).
      // Use the virtual 'fullName' property from the newUser object for the email.
      this.emailsService
        .sendWelcomeEmail(email, newUser.fullName, clientId)
        .catch((error) => {
          this.logger.error(
            `Failed to send welcome email: ${error.message}`,
            error.stack,
          );
        });

      // Return user details and the generated access token.
      // Include new fields like firstName, lastName, and isVerified.
      // 'roles' is now an array.
      return {
        user: {
          _id: newUser._id,
          email: newUser.email,
          firstName: newUser.firstName, // Include the new firstName field
          lastName: newUser.lastName,   // Include the new lastName field
          fullName: newUser.fullName,   // Access the virtual fullName property
          roles: newUser.roles,         // Include the new roles array
          isVerified: newUser.isVerified, // Include the new isVerified status
        },
        access_token: this.jwtService.sign(payload),
      };
    } catch (error) {
      this.logger.error(`Registration failed: ${error.message}`, error.stack);
      // Re-throw the error to be handled by NestJS's global exception filter
      throw error;
    }
  }

  
  /**
   * Login a user
   */
  async login(loginDto: LoginDto): Promise<any> {
    const { email, password } = loginDto;

    try {
      // Find user by email, ensuring they are active and not deleted
      const user = await this.userModel
        .findOne({
          email,
          isActive: true,
          isDeleted: false,
        })
        .exec();

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if user belongs to an active client (if it has a client)
      // This section is commented out in your provided code, keeping it as is.
      // if (user.clientId) {
      //   try {
      //     const client = await this.clientsService.findOne(
      //       user.clientId.toString(),
      //     );
      //     if (!client || !client.isActive) {
      //       throw new UnauthorizedException(
      //         'Your organization account is inactive',
      //       );
      //     }
      //   } catch (error) {
      //     if (error instanceof NotFoundException) {
      //       throw new UnauthorizedException(
      //         'Your organization account no longer exists',
      //       );
      //     }
      //     throw error;
      //   }
      // }

      // Generate JWT token payload
      // Use the new 'roles' array for the JWT payload
      const payload = {
        email: user.email,
        sub: user._id,
        roles: user.roles, // Changed from 'role' to 'roles'
      };

      // Return user details and the generated access token
      // Include new fields like firstName, lastName, and isVerified.
      // 'roles' is now an array.
      return {
        user: {
          _id: user._id,
          email: user.email,
          firstName: user.firstName, // Include the new firstName field
          lastName: user.lastName,   // Include the new lastName field
          fullName: user.fullName,   // Access the virtual fullName property
          roles: user.roles,         // Include the new roles array
          isVerified: user.isVerified, // Include the new isVerified status
        },
        access_token: this.jwtService.sign(payload),
      };
    } catch (error) {
      this.logger.error(`Login failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get user profile by ID
   */
  async getUserById(userId: string): Promise<any> {
    try {
      const user = await this.userModel
        .findById(userId)
        .select('-password')
        .exec();

      if (!user || user.isDeleted) {
        throw new NotFoundException('User not found');
      }

      return user;
    } catch (error) {
      this.logger.error(`Get user failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update user's password
   */
  async updatePassword(
    userId: string,
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<any> {
    const { currentPassword, newPassword } = updatePasswordDto;

    try {
      // Find user
      const user = await this.userModel.findById(userId).exec();
      if (!user || user.isDeleted) {
        throw new NotFoundException('User not found');
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password,
      );
      if (!isPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      user.password = hashedPassword;
      await user.save();

      return { message: 'Password updated successfully' };
    } catch (error) {
      this.logger.error(
        `Update password failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Initiate forgot password process
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<any> {
    const { email } = forgotPasswordDto;

    try {
      // Find user by email
      const user = await this.userModel
        .findOne({ email, isDeleted: false })
        .exec();
      if (!user) {
        // We don't want to reveal if a user exists or not for security reasons
        return {
          message:
            'If an account exists with this email, a password reset link has been sent',
        };
      }

      // Generate password reset token (could use a separate collection for this)
      const resetToken =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      const resetTokenExpiry = new Date();
      resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // Token valid for 1 hour

      // Save token to user
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = resetTokenExpiry;
      await user.save();

      // In a real application, send an email with the reset link
      // For now, we'll just return the token (in a real app, never return this directly)
      const resetLink = `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${resetToken}`;

      // In development, log the link for testing
      if (this.configService.get('NODE_ENV') !== 'production') {
        this.logger.debug(`Password reset link: ${resetLink}`);
      }

      // TODO: Send email with reset link

      return {
        message:
          'If an account exists with this email, a password reset link has been sent',
        // Only include this in development
        ...(this.configService.get('NODE_ENV') !== 'production' && {
          resetLink,
        }),
      };
    } catch (error) {
      this.logger.error(
        `Forgot password failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Reset password using token
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<any> {
    const { token, newPassword } = resetPasswordDto;

    try {
      // Find user by reset token
      const user = await this.userModel
        .findOne({
          resetPasswordToken: token,
          resetPasswordExpires: { $gt: new Date() },
          isDeleted: false,
        })
        .exec();

      if (!user) {
        throw new BadRequestException(
          'Invalid or expired password reset token',
        );
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user password and clear reset token
      user.password = hashedPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      return { message: 'Password has been reset successfully' };
    } catch (error) {
      this.logger.error(`Reset password failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Validate JWT token payload
   */
  async validateUser(payload: any): Promise<any> {
    const user = await this.userModel
      .findById(payload.sub)
      .select('-password')
      .exec();

    if (!user || user.isDeleted || !user.isActive) {
      return null;
    }

    return user;
  }
}
