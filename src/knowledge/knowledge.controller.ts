import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ApiOkResponseWrapped } from '../common/response/api-response.dto';
import { API_KEY_SECURITY_NAME } from '../common/security/security.constants';
import { ImportTextDto } from './dto/import-text.dto';
import {
  ImportDocumentResponseDto,
  QueryKnowledgeResponseDto,
} from './dto/knowledge-response.dto';
import { QueryKnowledgeDto } from './dto/query.dto';
import { MAX_UPLOAD_BYTES } from './dto/upload-document.schema';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { KnowledgeService } from './knowledge.service';

@ApiTags('AI Knowledge')
@ApiSecurity(API_KEY_SECURITY_NAME)
@Controller('ai/knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post('documents/text')
  @ApiOperation({ summary: '导入文本到知识库' })
  @ApiOkResponseWrapped(ImportDocumentResponseDto, '文本导入成功')
  async importText(
    @Body() body: ImportTextDto,
  ): Promise<ImportDocumentResponseDto> {
    return this.knowledgeService.importText(body.text, {
      source: body.source,
    });
  }

  @Post('documents/upload')
  @ApiOperation({
    summary: '上传文件到知识库',
    description:
      '支持 .txt、.md、.pdf、.docx、.xlsx、.xls 格式，单文件最大 20MB',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '待导入的文档文件',
        },
      },
    },
  })
  @ApiOkResponseWrapped(ImportDocumentResponseDto, '文件导入成功')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  async uploadDocument(
    @UploadedFile() file: UploadDocumentDto,
  ): Promise<ImportDocumentResponseDto> {
    return this.knowledgeService.importFile(file.buffer, file.originalname);
  }

  @Post('query')
  @ApiOperation({ summary: '基于知识库检索并回答问题' })
  @ApiOkResponseWrapped(QueryKnowledgeResponseDto, '问答成功')
  async query(
    @Body() body: QueryKnowledgeDto,
  ): Promise<QueryKnowledgeResponseDto> {
    return this.knowledgeService.query(body.question);
  }
}
