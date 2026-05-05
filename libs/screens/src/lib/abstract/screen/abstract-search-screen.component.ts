import {
  AfterViewInit,
  Component,
  inject,
  Injector,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ScreenStateEnum } from '../../config/screen-state.enum';
import { ViewModelEntity } from '../../entities/view-model.entity';
import { SearchEntity, SortDirectionEnum } from '../../entities/search.entity';
import { AbstractScreenComponent } from './abstract-screen.component';
import { Table, TableLazyLoadEvent } from 'primeng/table';
import { take } from 'rxjs';

/**
 * Column definition interface for ef-datatable integration.
 * Kept minimal here to avoid circular dependency on @elasticias/ui.
 */
export interface ScreenDatatableColumn {
  field: string;
  header: string;
  type?: string;
  [key: string]: any;
}

@Component({
  template: '',
  standalone: true,
})
export abstract class AbstractSearchScreenComponent
  extends AbstractScreenComponent
  implements AfterViewInit, OnInit, OnDestroy
{
  protected readonly screenState = ScreenStateEnum.SEARCH;

  @ViewChild('pTable') pTable!: Table;

  entity: any = new ViewModelEntity({});
  searchEntity = new SearchEntity(this.entity);
  enableDateRangeFilter = true;
  isLazySearch = true;
  lastSearchEvent: TableLazyLoadEvent | null = null;

  tableColumns: any[] = [];

  protected injector = inject(Injector);
  private serviceInstance: any;
  private isInitialLoad = true;

  override ngOnInit(): void {
    super.ngOnInit();
    this.serviceInstance = this.injector.get(this.getConfig()!.SERVICE as any);

    this.tableColumns = this.getTableColumns();

    const screenConfig = this.getConfig();
    const hasDynamicRefs = (screenConfig?.SEARCH_REFERENTIALS_KEYS?.length ?? 0) > 0;
    const hasStaticLists = (screenConfig?.SEARCH_STATIC_LISTS?.length ?? 0) > 0;

    if (hasDynamicRefs || hasStaticLists) {
      if (hasDynamicRefs) {
        this.initializeReferenceKeys(screenConfig!.SEARCH_REFERENTIALS_KEYS);
      }

      if (hasStaticLists) {
        this.initializeStaticLists(screenConfig!.SEARCH_STATIC_LISTS);
      }

      this.loadReferenceData(screenConfig!.REF_DATA_OPTIONS);

      this.refDataLoaded$.pipe(take(1)).subscribe(() => {
        this.triggerSearchIfNeeded();
      });
    } else {
      this.triggerSearchIfNeeded();
    }
  }

  protected getTableColumns(): any[] {
    return [];
  }

  private triggerSearchIfNeeded() {
    const cachedCriteria = this.cacheService.getCache<any>(this.screenStateKey);
    if (cachedCriteria) {
      this.searchEntity = new SearchEntity(cachedCriteria);
      this.entity.buildEntity(this.searchEntity);
      this.searchEntity.items = [];

      if (this.searchEntity.startEndDateRanges) {
        this.entity.startEndDateRanges = [
          new Date(this.searchEntity.start!),
          new Date(this.searchEntity.end!),
        ];
      }

      this.changeDetector.detectChanges();
      this.search();
    } else {
      this.search();
    }
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    if (this.isInitialLoad) {
      this.isInitialLoad = false;
      return;
    }

    if (this.isReactiveBindingEcho(event)) {
      return;
    }

    this.search(event);
  }

  private isReactiveBindingEcho(event: TableLazyLoadEvent): boolean {
    if (!this.searchEntity.sort || this.searchEntity.sort.length === 0) {
      return false;
    }

    const currentSort = this.searchEntity.sort[0];
    const eventSortField = Array.isArray(event.sortField)
      ? event.sortField[0]
      : event.sortField;
    const eventSortDirection =
      event.sortOrder === 1 ? SortDirectionEnum.ASC : SortDirectionEnum.DESC;

    const currentPage = this.searchEntity.pagination?.pageNumber || 1;
    const currentPageSize = this.searchEntity.pagination?.pageSize || 10;
    const eventPage = this.getPageNumber(event);
    const eventPageSize = event.rows || 10;

    return (
      currentSort.field === eventSortField &&
      currentSort.sortDirection === eventSortDirection &&
      currentPage === eventPage &&
      currentPageSize === eventPageSize
    );
  }

  private prepareSearch(event: TableLazyLoadEvent | null): void {
    this.searchEntity.buildEntity(this.entity);
    const e = event || this.lastSearchEvent || { first: 0, rows: 10 };

    this.searchEntity.pagination = {
      pageNumber: this.getPageNumber(e),
      pageSize: e.rows || 10,
    };

    if (this.entity.startEndDateRanges) {
      this.searchEntity.start = this.entity.startEndDateRanges[0];
      this.searchEntity.end = this.entity.startEndDateRanges[1];
    } else {
      this.searchEntity.start = null;
      this.searchEntity.end = null;
    }

    if (this.isLazySearch) {
      if (e.sortField) {
        const sortField = this.getSortField(e);
        this.searchEntity.sort = [
          {
            field: sortField,
            sortDirection: this.getSortDirection(e),
          },
        ];
      } else if (!this.searchEntity.sort || this.searchEntity.sort.length === 0) {
        const defaultSort = this.getConfig()?.DEFAULT_SORT;
        this.searchEntity.sort = [
          {
            field: defaultSort?.field || 'id',
            sortDirection: defaultSort?.direction || SortDirectionEnum.DESC,
          },
        ];
      }
    }
  }

  protected search(event: TableLazyLoadEvent | null = null): void {
    this.prepareSearch(event);

    this.serviceInstance.search(this.searchEntity).subscribe({
      next: (result: any) => {
        this.lastSearchEvent = event;
        this.searchEntity = Object.assign(new SearchEntity({}), this.searchEntity, result);
        this.cacheService.setCache(this.screenStateKey, this.searchEntity);
        this.changeDetector.detectChanges();
      },
      error: () => {
        // Errors handled by global error handler
      },
    });
  }

  paginate(event: any) {
    const pageNumber = this.getPageNumber(event);
    const pageSize = event.rows;

    this.searchEntity.pagination.pageNumber = pageNumber;
    this.searchEntity.pagination.pageSize = pageSize;

    if (
      this.searchEntity.items == null ||
      this.searchEntity.items.length === 0
    ) {
      return;
    }
  }

  getPageNumber(event: TableLazyLoadEvent): number {
    return event.first != null
      ? Math.floor(event.first / (event.rows || 10)) + 1
      : 1;
  }

  getSortField(event: TableLazyLoadEvent): string {
    return Array.isArray(event.sortField)
      ? event.sortField[0]
      : event.sortField || 'id';
  }

  getSortDirection(event: TableLazyLoadEvent): string {
    return event.sortOrder === 1
      ? SortDirectionEnum.ASC
      : SortDirectionEnum.DESC;
  }

  navigateToDetails(id?: any): void {
    const path =
      id || id === 0
        ? `${this.currentUrl}/details/${id}`
        : `${this.currentUrl}/details`;
    this.router.navigate([path]);
  }

  add() {
    this.router.navigate([this.currentUrl.concat('/details')]);
  }

  edit(id: any) {
    if (!id) {
      this.toastService.showError('Item [id] is undefined !');
      return;
    }
    this.router.navigate([this.currentUrl.concat('/details/'), id]);
  }

  delete(id: any): void {
    if (!id) return this.toastService.showError('Item [id] is undefined!');

    this.confirmDialogService.confirm(
      'Êtes-vous sûr de vouloir supprimer ?',
      () =>
        this.serviceInstance.delete(id).subscribe({
          next: (result: any) => {
            if (result && result.errors && result.errors.length > 0) {
              this.handleErrors(result.errors);
            } else {
              this.search();
              this.toastService.showSuccess();
            }
          },
          error: () => {
            // Errors handled by global error handler
          },
        }),
      () => {
        // User cancelled deletion
      },
    );
  }

  duplicate(id: any) {
    if (!id) {
      this.toastService.showError('Item [id] is undefined !');
      return;
    }
    this.router.navigate(
      [this.currentUrl.concat('/details/'), id],
      { queryParams: { mode: 'duplicate' } }
    );
  }

  clear(): void {
    this.entity.clearFields();
    this.searchEntity.clearFields();
    this.searchEntity = new SearchEntity({});

    this.lastSearchEvent = null;
    this.isInitialLoad = true;

    this.cacheService.setCache(this.screenStateKey, this.searchEntity);

    if (this.pTable) {
      this.pTable.first = 0;
      this.pTable.reset();
    }

    this.changeDetector.detectChanges();
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}
