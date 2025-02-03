import mongoose from 'mongoose';
import { getPageDb, getPageModel } from '@/lib/db';

export class PageService {
  private static instance: PageService;
  private constructor() {}

  public static getInstance(): PageService {
    if (!PageService.instance) {
      PageService.instance = new PageService();
    }
    return PageService.instance;
  }

  async createPage(pageData: any, userId: string) {
    try {
      await getPageDb();
      const Page = getPageModel();
      
      const page = new Page({
        ...pageData,
        createdBy: new mongoose.Types.ObjectId(userId)
      });
      
      const savedPage = await page.save();
      return savedPage;
    } catch (error) {
      console.error('Error in createPage:', error);
      throw error;
    }
  }

  async getPagesByUser(userId: string) {
    try {
      await getPageDb();
      const Page = getPageModel();
      return await Page.find({ createdBy: userId });
    } catch (error) {
      console.error('Error in getPagesByUser:', error);
      throw error;
    }
  }

  async getPageById(pageId: string, userId: string) {
    try {
      await getPageDb();
      const Page = getPageModel();
      return await Page.findOne({ 
        _id: pageId, 
        createdBy: userId 
      });
    } catch (error) {
      console.error('Error in getPageById:', error);
      throw error;
    }
  }

  async updatePage(pageId: string, userId: string, updateData: any) {
    try {
      await getPageDb();
      const Page = getPageModel();
      return await Page.findOneAndUpdate(
        { _id: pageId, createdBy: userId },
        { ...updateData, lastModified: new Date() },
        { new: true }
      );
    } catch (error) {
      console.error('Error in updatePage:', error);
      throw error;
    }
  }
}

export default PageService.getInstance();