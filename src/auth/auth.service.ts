// src/auth/services/auth.service.ts
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
import { ClientsService } from 'src/clients/clients.service';
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
    private clientsService: ClientsService,
    private configService: ConfigService,
    private emailsService: EmailsService,
  ) {}

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto): Promise<any> {
    const {
      email,
      password,
      clientId,
      role = UserRole.PATIENT,
      fullName,
    } = registerDto;

    try {
      // Check if the client exists (unless it's an admin user with no client)
      if (clientId) {
        const client = await this.clientsService.findOne(clientId);
        if (!client) {
          throw new BadRequestException('Client does not exist');
        }
      }

      // Check if user already exists
      const existingUser = await this.userModel.findOne({ email }).exec();
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user
      const newUser = new this.userModel({
        ...registerDto,
        password: hashedPassword,
      });

      await newUser.save();

      // Generate JWT token
      const payload = {
        email: newUser.email,
        sub: newUser._id,
        role: newUser.role,
        clientId: newUser.clientId,
      };

      // Send welcome email (don't await to avoid blocking)
      this.emailsService
        .sendWelcomeEmail(email, fullName, clientId)
        .catch((error) => {
          this.logger.error(
            `Failed to send welcome email: ${error.message}`,
            error.stack,
          );
        });

      return {
        user: {
          _id: newUser._id,
          email: newUser.email,
          fullName: newUser.fullName,
          role: newUser.role,
          clientId: newUser.clientId,
        },
        access_token: this.jwtService.sign(payload),
      };
    } catch (error) {
      this.logger.error(`Registration failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Login a user
   */
  async login(loginDto: LoginDto): Promise<any> {
    const { email, password } = loginDto;

    try {
      // Find user by email
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
      if (user.clientId) {
        try {
          const client = await this.clientsService.findOne(
            user.clientId.toString(),
          );
          if (!client || !client.isActive) {
            throw new UnauthorizedException(
              'Your organization account is inactive',
            );
          }
        } catch (error) {
          if (error instanceof NotFoundException) {
            throw new UnauthorizedException(
              'Your organization account no longer exists',
            );
          }
          throw error;
        }
      }

      // Generate JWT token
      const payload = {
        email: user.email,
        sub: user._id,
        role: user.role,
        clientId: user.clientId,
      };

      return {
        user: {
          _id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          clientId: user.clientId,
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
