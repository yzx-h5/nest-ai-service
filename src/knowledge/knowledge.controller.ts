import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
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
import { runSseStream } from '../common/streaming/sse.util';
import { decodeUploadFilename } from '../common/upload/decode-upload-filename';
import { API_KEY_SECURITY_NAME } from '../common/security/security.constants';
import {
  DeleteDocumentParamDto,
  DeleteDocumentsBySourceDto,
} from './dto/delete-documents.dto';
import { ImportTextDto } from './dto/import-text.dto';
import {
  DeleteKnowledgeDocumentsResponseDto,
  ImportDocumentResponseDto,
  ListKnowledgeDocumentsResponseDto,
  QueryKnowledgeResponseDto,
} from './dto/knowledge-response.dto';
import { ListDocumentsDto } from './dto/list-documents.dto';
import { QueryKnowledgeDto } from './dto/query.dto';
import { MAX_UPLOAD_BYTES } from './dto/upload-document.schema';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { KnowledgeService } from './knowledge.service';
import type { Response } from 'express';

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
    return this.knowledgeService.importFile(
      file.buffer,
      decodeUploadFilename(file.originalname),
    );
  }

  @Get('documents')
  @ApiOperation({ summary: '分页查询知识库片段' })
  @ApiOkResponseWrapped(ListKnowledgeDocumentsResponseDto, '查询成功')
  async listDocuments(
    @Query() query: ListDocumentsDto,
  ): Promise<ListKnowledgeDocumentsResponseDto> {
    return this.knowledgeService.listDocuments(query);
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: '按片段 id 删除知识库记录' })
  @ApiOkResponseWrapped(DeleteKnowledgeDocumentsResponseDto, '删除成功')
  async deleteDocumentById(
    @Param() params: DeleteDocumentParamDto,
  ): Promise<DeleteKnowledgeDocumentsResponseDto> {
    return this.knowledgeService.deleteDocumentById(params.id);
  }

  @Delete('documents')
  @ApiOperation({
    summary: '按 source 删除知识库文档',
    description: '删除指定来源标识下的所有文本切片',
  })
  @ApiOkResponseWrapped(DeleteKnowledgeDocumentsResponseDto, '删除成功')
  async deleteDocumentsBySource(
    @Query() query: DeleteDocumentsBySourceDto,
  ): Promise<DeleteKnowledgeDocumentsResponseDto> {
    return this.knowledgeService.deleteDocumentsBySource(query.source);
  }

  @Post('query')
  @ApiOperation({
    summary: '基于知识库检索并回答问题',
    description:
      'stream 为 true 时返回 text/event-stream，推送检索/生成步骤（step）及回答片段（token）',
  })
  @ApiOkResponseWrapped(QueryKnowledgeResponseDto, '问答成功')
  async query(
    @Body() body: QueryKnowledgeDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<QueryKnowledgeResponseDto | void> {
    if (body.stream) {
      await runSseStream(res, async (emit) => {
        await this.knowledgeService.streamQuery(body.question, emit);
      });
      return;
    }

    return this.knowledgeService.query(body.question);
  }
}
