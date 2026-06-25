import React from 'react';
import { useAppDispatch } from '@/redux/hooks';
import { updateBlockContent } from '@/redux/canvasSlice';
import { BlockData } from '@/types/index';
import { ContactProperties } from './custom/ContactProperties';
import { ContentProperties } from './custom/ContentProperties';
import { FeatureProperties } from './custom/FeatureProperties';
import { EcommerceCustomProperties } from './custom/EcommerceCustomProperties';
import { HeroProperties } from './custom/HeroProperties';

interface CustomBlockPropertiesProps {
  selectedBlock: BlockData;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, callback: (path: string) => void) => void;
  isUploadingImage: boolean;
}

export const CustomBlockProperties: React.FC<CustomBlockPropertiesProps> = ({
  selectedBlock,
  handleImageUpload,
  isUploadingImage,
}) => {
  const dispatch = useAppDispatch();

  const content = React.useMemo(() => {
    if (!selectedBlock?.content || !selectedBlock.content.startsWith('{')) return {};
    try {
      return JSON.parse(selectedBlock.content);
    } catch {
      return {};
    }
  }, [selectedBlock.content]);

  const handleJsonContentChange = (key: string, value: unknown) => {
    const updatedContent = { ...content, [key]: value };
    dispatch(
      updateBlockContent({ id: selectedBlock.uniqueId, content: JSON.stringify(updatedContent) })
    );
  };

  const type = selectedBlock.type;

  return (
    <>
      <ContactProperties type={type} content={content} handleJsonContentChange={handleJsonContentChange} />
      <ContentProperties 
        type={type} 
        content={content} 
        handleJsonContentChange={handleJsonContentChange} 
        handleImageUpload={handleImageUpload} 
        isUploadingImage={isUploadingImage} 
      />
      <FeatureProperties 
        type={type} 
        content={content} 
        handleJsonContentChange={handleJsonContentChange} 
        handleImageUpload={handleImageUpload} 
        isUploadingImage={isUploadingImage} 
      />
      <EcommerceCustomProperties 
        type={type} 
        content={content} 
        handleJsonContentChange={handleJsonContentChange} 
        handleImageUpload={handleImageUpload} 
        isUploadingImage={isUploadingImage} 
      />
      <HeroProperties 
        type={type} 
        content={content} 
        handleJsonContentChange={handleJsonContentChange} 
        handleImageUpload={handleImageUpload} 
        isUploadingImage={isUploadingImage} 
      />
    </>
  );
};
