import { Module } from '@nestjs/common';
import { SignTaskService } from './sign-task.service';
import { SignTaskController } from './sign-task.controller';

@Module({
  controllers: [SignTaskController],
  providers: [SignTaskService],
})
export class SignTaskModule {}
