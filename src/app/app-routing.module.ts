import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TaskListComponent } from './features/tasks/components/task-list/task-list.component';
import { TaskFormComponent } from './features/tasks/components/task-form/task-form.component';

const routes: Routes = [
  { path: '', redirectTo: 'tasks', pathMatch: 'full' },

  {
    path: 'tasks',
    component: TaskListComponent,
    children: [
      { path: 'add', component: TaskFormComponent },
      { path: 'edit/:id', component: TaskFormComponent }
    ]
  }
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
