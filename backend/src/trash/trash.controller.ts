import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { ApiCollectionResponseDto } from 'src/shared/dto/output/api-collection-response.dto';
import { TRASH_SWAGGER_TAG } from 'src/swagger.config';
import { TrashFilterDto } from './dto/input/trash-filter.dto';
import { TrashCollectionResponseDto } from './dto/output/trash-collection-response.dto';
import { TrashItemDto } from './dto/output/trash-response.dto';
import { TrashService } from './services/trash.service';

@Controller('trash')
@ApiTags(TRASH_SWAGGER_TAG)
@UseGuards(AuthGuard)
export class TrashController {
  constructor(private readonly trashService: TrashService) {}

  @Get()
  @ApiOperation({
    summary: "Get all the user's trashed items, includes workspaces, documents and conversations",
  })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiOkResponse({ type: TrashCollectionResponseDto })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() filters: TrashFilterDto,
  ): Promise<ApiCollectionResponseDto<TrashItemDto>> {
    const data = await this.trashService.findAll(userId, filters);
    return {
      data,
    };
  }
}
