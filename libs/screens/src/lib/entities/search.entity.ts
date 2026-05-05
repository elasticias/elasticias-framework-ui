import { AbstractEntity } from '../abstract/abstract.entity';

export enum SortDirectionEnum {
  ASC = 'Ascending',
  DESC = 'Descending',
  DEFAULT_SORT_FIELD = 'id',
}

export enum PaginationEnum {
  DEFAULT_PAGE = 1,
  DEFAULT_PAGE_SIZE = 10,
}

export class SearchEntity extends AbstractEntity {
  pagination: { pageNumber: number; pageSize: number } = {
    pageNumber: PaginationEnum.DEFAULT_PAGE,
    pageSize: PaginationEnum.DEFAULT_PAGE_SIZE,
  };

  sort: Array<{ field: string; sortDirection: string }> = [];

  totalPages = 0;
  totalCount = 0;
  items: AbstractEntity[] = [];
  start: Date | null = null;
  end: Date | null = null;
  startEndDateRanges: Date[] | null = null;

  constructor(entity: Record<string, unknown>) {
    super();
    this.buildEntity(entity);

    if (!this.pagination) {
      this.pagination = {
        pageNumber: PaginationEnum.DEFAULT_PAGE,
        pageSize: PaginationEnum.DEFAULT_PAGE_SIZE,
      };
    }

    if (!this.sort) {
      this.sort = [{ field: SortDirectionEnum.DEFAULT_SORT_FIELD, sortDirection: SortDirectionEnum.DESC }];
    }

    if (!this.startEndDateRanges && entity['start'] && entity['end']) {
      this.startEndDateRanges = [new Date(entity['start'] as string), new Date(entity['end'] as string)];
    }
  }

  getSearchCriteria(): Record<string, unknown> {
    const { items: _items, totalPages: _totalPages, totalCount: _totalCount, ...criteria } = this;
    return criteria;
  }
}
