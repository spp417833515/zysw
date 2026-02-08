import React, { useState } from 'react';
import { Upload, message, Image } from 'antd';
import { PlusOutlined, FilePdfOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload';
import type { Attachment } from '@/types/transaction';
import { toDisplayUrl } from '@/utils/format';

interface ImageUploadProps {
  value?: Attachment[];
  onChange?: (value: Attachment[]) => void;
  maxCount?: number;
  /** 接受的文件类型，默认 "image/*" */
  accept?: string;
  /** 上传按钮文字 */
  label?: string;
}

function isPdf(file: { type?: string; name?: string; url?: string }) {
  const t = (file.type || '').toLowerCase();
  if (t === 'application/pdf' || t === 'application/x-pdf') return true;
  const name = file.name || file.url || '';
  return name.toLowerCase().endsWith('.pdf');
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  maxCount = 5,
  accept = 'image/*',
  label = '上传图片',
}) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');

  const [fileList, setFileList] = useState<UploadFile[]>(() => {
    if (value && value.length > 0) {
      return value.map((att, index) => ({
        uid: att.id || `${index}`,
        name: att.name || `file-${index}`,
        status: 'done' as const,
        url: toDisplayUrl(att.url),
        thumbUrl: isPdf(att) ? undefined : toDisplayUrl(att.url),
      }));
    }
    return [];
  });

  const handleChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setFileList(newFileList);

    const attachments: Attachment[] = newFileList
      .filter((file) => file.status === 'done')
      .map((file) => {
        const resp = (file.response as any)?.data;
        if (resp) {
          return {
            id: resp.id,
            name: resp.name,
            url: resp.url,
            type: resp.type,
            size: resp.size,
          };
        }
        // Existing file loaded from value
        const rawUrl = file.url || '';
        return {
          id: file.uid,
          name: file.name,
          url: rawUrl.replace(/^\/api/, ''),
          type: file.type || (isPdf(file) ? 'application/pdf' : 'image/unknown'),
          size: file.size || 0,
        };
      });

    onChange?.(attachments);
  };

  const allowPdf = accept.includes('pdf') || accept.includes('*');

  const handleBeforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isPdfFile = isPdf(file);

    if (!isImage && !(allowPdf && isPdfFile)) {
      message.error(allowPdf ? '只能上传图片或 PDF 文件' : '只能上传图片文件');
      return Upload.LIST_IGNORE;
    }

    const maxSize = isPdfFile ? 20 : 5;
    if (file.size / 1024 / 1024 > maxSize) {
      message.error(`文件大小不能超过 ${maxSize}MB`);
      return Upload.LIST_IGNORE;
    }

    return true;
  };

  const customRequest: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;
    const formData = new FormData();
    formData.append('file', file as File);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (json.code === 0) {
        onSuccess?.(json, new XMLHttpRequest());
      } else {
        onError?.(new Error(json.message || '上传失败'));
        message.error(json.message || '上传失败');
      }
    } catch (err) {
      onError?.(err as Error);
      message.error('上传失败，请检查网络');
    }
  };

  const handlePreview = async (file: UploadFile) => {
    const resp = (file.response as any)?.data;
    const fileUrl = resp ? toDisplayUrl(resp.url) : (file.thumbUrl || file.url || '');

    if (isPdf(file)) {
      window.open(fileUrl, '_blank');
      return;
    }

    setPreviewImage(fileUrl);
    setPreviewOpen(true);
  };

  // PDF 文件显示自定义图标
  const iconRender = (file: UploadFile) => {
    if (isPdf(file)) {
      return <FilePdfOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />;
    }
    return undefined;
  };

  return (
    <>
      <Upload
        accept={accept}
        listType="picture-card"
        fileList={fileList}
        onChange={handleChange}
        beforeUpload={handleBeforeUpload}
        customRequest={customRequest}
        onPreview={handlePreview}
        iconRender={iconRender}
        maxCount={maxCount}
      >
        {fileList.length >= maxCount ? null : (
          <div>
            <PlusOutlined />
            <div style={{ marginTop: 8 }}>{label}</div>
          </div>
        )}
      </Upload>
      {previewImage && (
        <Image
          wrapperStyle={{ display: 'none' }}
          preview={{
            visible: previewOpen,
            onVisibleChange: (visible) => setPreviewOpen(visible),
          }}
          src={previewImage}
        />
      )}
    </>
  );
};

export default ImageUpload;
