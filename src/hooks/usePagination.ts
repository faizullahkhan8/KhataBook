import { useState, useCallback } from 'react';

interface UsePaginationProps {
  initialPage?: number;
  pageSize?: number;
}

export const usePagination = ({ initialPage = 0, pageSize = 20 }: UsePaginationProps = {}) => {
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(true);

  const nextPage = useCallback(() => {
    setPage(prev => prev + 1);
  }, []);

  const prevPage = useCallback(() => {
    setPage(prev => Math.max(0, prev - 1));
  }, []);

  const resetPage = useCallback(() => {
    setPage(0);
    setHasMore(true);
  }, []);

  const resetHasMore = useCallback(() => {
    setHasMore(true);
  }, []);

  const goToPage = useCallback((targetPage: number) => {
    setPage(Math.max(0, targetPage));
  }, []);

  const markFetched = useCallback((count: number) => {
    if (count < pageSize) {
      setHasMore(false);
    }
  }, [pageSize]);

  const offset = page * pageSize;

  return {
    page,
    pageSize,
    offset,
    hasMore,
    nextPage,
    prevPage,
    resetPage,
    resetHasMore,
    goToPage,
    markFetched,
  };
};
