import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { Organization, OrganizationSchema } from './entities/organization.entity';
import { OrganizationRepository } from './organization.repository';
import { UsersModule } from 'src/users/users.module'; // Import UsersModule

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Organization.name, schema: OrganizationSchema }]),
    UsersModule, // Import UsersModule to make UsersService available for injection
  ],
  controllers: [OrganizationController],
  providers: [OrganizationService, OrganizationRepository],
  exports: [OrganizationService, OrganizationRepository], // Export OrganizationService for use in other modules (e.g., EventModule)
})
export class OrganizationModule { }
