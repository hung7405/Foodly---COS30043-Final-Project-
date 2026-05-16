export interface NewsArticle {
  id: number;
  title: string;
  content: string;
  category: string;
  imageUrl: string;
  publishedDate: string;
}

export interface NewsFilters {
  search: string;
  category: string;
  page: number;
  pageSize: number;
}
