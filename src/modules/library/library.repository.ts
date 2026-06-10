import { db } from "../../config/db";

export class LibraryRepository {
  async listAll() {
    return db.library_items.findMany({
      where: { is_link_broken: false },
      orderBy: { created_at: "desc" },
    });
  }

  async findById(id: string) {
    return db.library_items.findUnique({ where: { id } });
  }

  async filterByCategory(category: string) {
    return db.library_items.findMany({
      where: {
        category: category as any,
        is_link_broken: false,
      },
      orderBy: { created_at: "desc" },
    });
  }

  async filterByDepartment(department: string) {
    return db.library_items.findMany({
      where: {
        academic_department: department,
        is_link_broken: false,
      },
      orderBy: { created_at: "desc" },
    });
  }

  async filterByAcademicYear(academicYear: number) {
    return db.library_items.findMany({
      where: {
        academic_year: academicYear,
        is_link_broken: false,
      },
      orderBy: { created_at: "desc" },
    });
  }

  async filterByCourse(courseId: string) {
    return db.library_items.findMany({
      where: {
        course_id: courseId,
        is_link_broken: false,
      },
      orderBy: { created_at: "desc" },
    });
  }

  async filterByDocumentType(documentType: string) {
    return db.library_items.findMany({
      where: {
        document_type: documentType as any,
        is_link_broken: false,
      },
      orderBy: { created_at: "desc" },
    });
  }

  async filterRecursive(filters: {
    category?: string;
    academic_department?: string;
    academic_year?: number;
    course_id?: string;
    document_type?: string;
  }) {
    return db.library_items.findMany({
      where: {
        ...(filters.category && { category: filters.category as any }),
        ...(filters.academic_department && {
          academic_department: filters.academic_department,
        }),
        ...(filters.academic_year && { academic_year: filters.academic_year }),
        ...(filters.course_id && { course_id: filters.course_id }),
        ...(filters.document_type && {
          document_type: filters.document_type as any,
        }),
        is_link_broken: false,
      },
      orderBy: { created_at: "desc" },
    });
  }

  async searchByTitle(query: string) {
    return db.library_items.findMany({
      where: {
        title: { contains: query, mode: "insensitive" },
        is_link_broken: false,
      },
      orderBy: { created_at: "desc" },
    });
  }

  async incrementLikes(id: string) {
    return db.library_items.update({
      where: { id },
      data: { likes: { increment: 1 } },
    });
  }

  async incrementDownloads(id: string) {
    return db.library_items.update({
      where: { id },
      data: { downloads: { increment: 1 } },
    });
  }

  async createItem(data: {
    title: string;
    description?: string;
    drive_url: string;
    category: "SPIRITUAL" | "ACADEMIC" | "OTHER";
    academic_department?: string | null;
    academic_year?: number | null;
    course_id?: string | null;
    document_type?: "TEXTBOOK" | "PAST_EXAM" | null;
  }) {
    return db.library_items.create({
      data,
    });
  }

  async updateItem(
    id: string,
    data: {
      title?: string;
      description?: string;
      drive_url?: string;
      category?: "SPIRITUAL" | "ACADEMIC" | "OTHER";
      academic_department?: string | null;
      academic_year?: number | null;
      course_id?: string | null;
      document_type?: "TEXTBOOK" | "PAST_EXAM" | null;
    },
  ) {
    return db.library_items.update({
      where: { id },
      data,
    });
  }

  async deleteItem(id: string) {
    await db.library_items.delete({ where: { id } });
  }

  async markLinkBroken(id: string) {
    return db.library_items.update({
      where: { id },
      data: {
        is_link_broken: true,
        last_checked_at: new Date(),
      },
    });
  }

  async markLinkWorking(id: string) {
    return db.library_items.update({
      where: { id },
      data: {
        is_link_broken: false,
        last_checked_at: new Date(),
      },
    });
  }

  async getAllItemsForLinkCheck() {
    return db.library_items.findMany({
      select: { id: true, drive_url: true },
    });
  }
}

export const libraryRepository = new LibraryRepository();
