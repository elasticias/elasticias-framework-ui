import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'truncate', standalone: true })
export class TruncatePipe implements PipeTransform {
  transform(value: string, maxLength = 50, suffix = '...'): string {
    if (!value) return '';
    return value.length > maxLength ? value.slice(0, maxLength) + suffix : value;
  }
}
