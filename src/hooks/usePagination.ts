import { useState, useCallback } from 'react';

interface UsePaginationProps {
  initialPage?: number;
  pageSize?: number;
}

export const usePagination = ({ initialPage = 0, pageSize = 20 }: UsePaginationProps = {}) => {
  const [page, setPage] = useState(initialPage);

  const nextPage = useCallback(() => {
    setPage(prev => prev + 1);
  }, []);

  const prevPage = useCallback(() => {
    setPage(prev => Math.max(0, prev - 1));
  }, []);

  const resetPage = useCallback(() => {
    setPage(0);
  }, []);

  const goToPage = useCallback((targetPage: number) => {
    setPage(Math.max(0, targetPage));
  }, []);

  const offset = page * pageSize;

  return {
    page,
    pageSize,
    offset,
    nextPage,
    prevPage,
    resetPage,
    goToPage,
  };
};
