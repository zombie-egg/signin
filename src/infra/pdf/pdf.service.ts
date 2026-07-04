import { Injectable } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import * as crypto from 'node:crypto';

/** 单枚图层叠加参数。坐标原点为 PDF 页面左下角，单位 pt。 */
export interface StampLayer {
  page: number; // 1-based
  posX: number;
  posY: number;
  width: number;
  height: number;
  image: Buffer; // PNG/JPEG
}

@Injectable()
export class PdfService {
  /** 计算 SHA256 防篡改哈希 */
  sha256(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /** 返回各页尺寸（1-based 页码 -> {width,height}），用于坐标系换算 */
  async getPageSizes(pdf: Buffer): Promise<Record<number, { width: number; height: number }>> {
    const doc = await PDFDocument.load(pdf, { updateMetadata: false });
    const sizes: Record<number, { width: number; height: number }> = {};
    doc.getPages().forEach((p, i) => {
      const { width, height } = p.getSize();
      sizes[i + 1] = { width, height };
    });
    return sizes;
  }

  /** 简单校验是否为合法 PDF（magic number + 可解析） */
  async isValidPdf(buffer: Buffer): Promise<boolean> {
    if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') return false;
    try {
      await PDFDocument.load(buffer, { updateMetadata: false });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 在指定坐标叠加多枚图层（印章/手写签名），返回新 PDF Buffer。
   * 图片按 PNG 优先解析，失败回退 JPEG。
   */
  async overlayImages(pdf: Buffer, layers: StampLayer[]): Promise<Buffer> {
    const doc = await PDFDocument.load(pdf);
    const pages = doc.getPages();

    for (const layer of layers) {
      const page = pages[layer.page - 1];
      if (!page) continue;
      let img;
      try {
        img = await doc.embedPng(layer.image);
      } catch {
        img = await doc.embedJpg(layer.image);
      }
      page.drawImage(img, {
        x: layer.posX,
        y: layer.posY,
        width: layer.width,
        height: layer.height,
      });
    }

    const out = await doc.save();
    return Buffer.from(out);
  }

  /**
   * 写入签署防篡改元数据（时间戳 + 内容哈希）。
   * 注意：哈希写入元数据本身会改变文件，故约定：
   * 元数据里的 hash = 写入元数据"之前"内容的 sha256（archivedSha256 同源），
   * 事后校验时以 DB.archivedSha256 为准，元数据仅作可读留痕。
   */
  async writeSignMetadata(
    pdf: Buffer,
    meta: { signedAt: Date; contentHash: string; signer: string; taskId: string },
  ): Promise<Buffer> {
    const doc = await PDFDocument.load(pdf);
    doc.setSubject('电子签署归档件');
    doc.setKeywords([
      `signedAt:${meta.signedAt.toISOString()}`,
      `sha256:${meta.contentHash}`,
      `signer:${meta.signer}`,
      `taskId:${meta.taskId}`,
    ]);
    doc.setProducer('e-sign-system');
    doc.setModificationDate(meta.signedAt);
    const out = await doc.save();
    return Buffer.from(out);
  }
}
