import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./math-quiz/math-quiz-page').then((m) => m.MathQuizPage),
    title: 'Un viaje por el mundo de las matemáticas',
  },
  { path: 'math', redirectTo: '', pathMatch: 'full' },
  {
    path: 'animals',
    loadComponent: () => import('./animal-quiz/animal-quiz-page').then((m) => m.AnimalQuizPage),
    title: 'Un viatge pel món dels animals · Valencià',
  },
  {
    path: 'logic',
    loadComponent: () => import('./logic-challenges/logic-page').then((m) => m.LogicPage),
    title: 'Retos de lógica · Piensa, descubre y resuelve',
  },
  {
    path: 'logic/:id',
    loadComponent: () => import('./logic-challenges/logic-page').then((m) => m.LogicPage),
    title: 'Retos de lógica · Un nuevo descubrimiento',
  },
  { path: '**', redirectTo: '' },
];
