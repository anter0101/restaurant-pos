import { FindManyOptions, FindOptionsWhere, ILike } from 'typeorm';
import { Request } from 'express';
import { PaginateDTO } from './paginate.dto';
import { PageRequest } from './pagination.entity';
import { HeaderUtil } from './header-util';

export interface SearchQueryOptions<T> {
  query: PaginateDTO;
  searchableColumns?: (keyof T & string)[];
  where?: FindOptionsWhere<T> | FindOptionsWhere<T>[];
  relations?: string[];
}

export function buildSearchQuery<T>(
  options: SearchQueryOptions<T>,
): FindManyOptions<T> {
  const { query, searchableColumns = [], where, relations } = options;

  const pageRequest = new PageRequest(
    +(query.page ?? 1),
    +(query.pageSize ?? 10),
    query.sortField ? `${query.sortField},${query.sortOrder || 'ASC'}` : '',
  );

  const findOptions: FindManyOptions<T> = {
    skip: +pageRequest.page * pageRequest.size,
    take: +pageRequest.size,
    order: pageRequest.sort.asOrder() as any,
  };

  if (relations?.length) {
    findOptions.relations = relations;
  }

  const searchTerm = query.search?.trim();
  const hasSearch = searchTerm && searchableColumns.length > 0;
  const hasExtraWhere = where !== undefined;

  if (hasSearch && hasExtraWhere) {
    const extraWheres = Array.isArray(where) ? where : [where];
    const combined: FindOptionsWhere<T>[] = [];
    for (const col of searchableColumns) {
      for (const extra of extraWheres) {
        combined.push({
          ...extra,
          [col]: ILike(`%${searchTerm}%`),
        } as FindOptionsWhere<T>);
      }
    }
    findOptions.where = combined;
  } else if (hasSearch) {
    findOptions.where = searchableColumns.map(
      (col) => ({ [col]: ILike(`%${searchTerm}%`) }) as FindOptionsWhere<T>,
    );
  } else if (hasExtraWhere) {
    findOptions.where = where;
  }

  return findOptions;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
}

export function setPaginationHeaders(
  req: Request,
  total: number,
  query: PaginateDTO,
): void {
  const pageRequest = new PageRequest(
    +(query.page ?? 1),
    +(query.pageSize ?? 10),
    '',
  );
  HeaderUtil.addPaginationHeaders(
    req.res!,
    total,
    pageRequest.page,
    total > (pageRequest.page + 1) * pageRequest.size,
  );
}
