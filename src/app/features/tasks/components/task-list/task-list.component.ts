import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { TaskService } from '../../../../core/services/task.service';
import { Task } from 'src/app/models/task.model';
import { filter, forkJoin } from 'rxjs';

@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.css']
})
export class TaskListComponent implements OnInit {
  tasks: Task[] = [];
  filteredTasks: Task[] = [];
  paginatedTasks: Task[] = [];

  searchText = '';
  pageSize = 10;
  currentPage = 1;

  openMenuId: string | null = null;
  selectedTaskIds = new Set<string>();
  selectAllChecked = false;

  showDeleteModal = false;
  deleteTaskId: string | null = null;
  deleteTaskName = '';

  isModalOpen = false;
  showBulkDeleteModal = false;
  isBulkDeleting = false;

  constructor(
    private taskService: TaskService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        const url = this.router.url;
        this.isModalOpen = url.includes('/tasks/add') || url.includes('/tasks/edit');
        if (url === '/tasks') {
          this.loadTasks();
        }
      });
  }

  ngOnInit(): void {
    this.loadTasks();

    this.route.queryParams.subscribe(params => {
      if (params['lastPage']) {
        this.goLast();
        this.router.navigate([], { queryParams: {}, replaceUrl: true });
      }
    });
  }

  @HostListener('document:click')
  closeMenuOnOutsideClick(): void {
    this.openMenuId = null;
  }

  closeModal(): void {
    this.router.navigate(['/tasks']);
  }

  loadTasks(): void {
    this.taskService.getTasks().subscribe(res => {
      this.tasks = res;

      const validIds = new Set(this.tasks.map(t => t.id!));
      this.selectedTaskIds.forEach(id => {
        if (!validIds.has(id)) this.selectedTaskIds.delete(id);
      });

      this.applySearch();
    });
  }

  refreshTasks(): void {
    this.selectedTaskIds.clear();
    this.selectAllChecked = false;
    this.currentPage = 1;
    this.loadTasks();
  }

  applySearch(): void {
    const searchLower = this.searchText.toLowerCase();
    this.filteredTasks = this.tasks.filter(t =>
      t.assignedTo.toLowerCase().includes(searchLower) ||
      t.status.toLowerCase().includes(searchLower)
    );

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages || 1;
    }
    this.paginate();
  }

  paginate(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedTasks = this.filteredTasks.slice(start, start + this.pageSize);

    this.selectAllChecked = 
      this.paginatedTasks.length > 0 &&
      this.paginatedTasks.every(t => this.selectedTaskIds.has(t.id!));
  }

  get totalPages(): number {
    return Math.ceil(this.filteredTasks.length / this.pageSize);
  }

  changePageSize(): void {
    this.currentPage = 1;
    this.paginate();
  }

  goFirst(): void {
    this.currentPage = 1;
    this.paginate();
  }

  goPrev(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.paginate();
    }
  }

  goNext(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.paginate();
    }
  }

  goLast(): void {
    this.currentPage = this.totalPages;
    this.paginate();
  }

  toggleSelectAll(event: any): void {
    this.selectAllChecked = event.target.checked;
    if (this.selectAllChecked) {
      this.paginatedTasks.forEach(t => this.selectedTaskIds.add(t.id!));
    } else {
      this.paginatedTasks.forEach(t => this.selectedTaskIds.delete(t.id!));
    }
  }

  toggleRow(taskId: string, event: any): void {
    if (event.target.checked) {
      this.selectedTaskIds.add(taskId);
    } else {
      this.selectedTaskIds.delete(taskId);
      this.selectAllChecked = false;
    }
    this.selectAllChecked =
      this.paginatedTasks.length > 0 &&
      this.paginatedTasks.every(t => this.selectedTaskIds.has(t.id!));
  }

  isChecked(taskId: string): boolean {
    return this.selectedTaskIds.has(taskId);
  }

  toggleMenu(id: string): void {
    this.openMenuId = this.openMenuId === id ? null : id;
  }

  newTask(): void {
    this.router.navigate(['/tasks/add']);
  }

  editTask(id: string): void {
    this.openMenuId = null;
    this.router.navigate(['/tasks/edit', id]);
  }

  deleteTask(id: string, name?: string): void {
    this.openMenuId = null;
    this.deleteTaskId = id;
    this.deleteTaskName = name || '';
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (!this.deleteTaskId) return;
    this.taskService.deleteTask(this.deleteTaskId).subscribe(() => {
      this.showDeleteModal = false;
      this.deleteTaskId = null;
      this.loadTasks();
    });
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.deleteTaskId = null;
  }

  confirmDeleteSelected(): void {
    this.showBulkDeleteModal = true;
  }

  cancelBulkDelete(): void {
    this.showBulkDeleteModal = false;
  }

  confirmDeleteSelectedTasks(): void {
    const idsToDelete = this.paginatedTasks
      .filter(t => this.selectedTaskIds.has(t.id!))
      .map(t => t.id!);

    if (idsToDelete.length === 0) return;

    this.isBulkDeleting = true;

    const deleteObservables = idsToDelete.map(id => this.taskService.deleteTask(id));

    forkJoin(deleteObservables).subscribe(() => {
      this.showBulkDeleteModal = false;
      idsToDelete.forEach(id => this.selectedTaskIds.delete(id));
      this.tasks = this.tasks.filter(t => !idsToDelete.includes(t.id!));
      this.filteredTasks = this.filteredTasks.filter(t => !idsToDelete.includes(t.id!));

      this.selectAllChecked = false;
      this.isBulkDeleting = false;

      if (this.currentPage > this.totalPages) {
        this.currentPage = this.totalPages || 1;
      }
      this.paginate();
    }, error => {
      console.error('Error deleting tasks', error);
      this.showBulkDeleteModal = false;
      this.isBulkDeleting = false;
    });
  }
}
