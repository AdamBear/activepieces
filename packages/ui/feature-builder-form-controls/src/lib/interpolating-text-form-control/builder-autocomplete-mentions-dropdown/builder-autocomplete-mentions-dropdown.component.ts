import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';

import { Observable, of, switchMap, take, tap, map } from 'rxjs';
import { fadeIn400ms } from '@activepieces/ui/common';
import { BuilderAutocompleteMentionsDropdownService } from './builder-autocomplete-mentions-dropdown.service';
import { InsertMentionOperation } from '../utils';
import { Store } from '@ngrx/store';
import {
  BuilderSelectors,
  ViewModeEnum,
} from '@activepieces/ui/feature-builder-store';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-builder-autocomplete-mentions-dropdown',
  templateUrl: './builder-autocomplete-mentions-dropdown.component.html',
  styleUrls: ['./builder-autocomplete-mentions-dropdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeIn400ms],
})
export class BuilderAutocompleteMentionsDropdownComponent {
  @ViewChild('mentionsList', { read: ElementRef }) mentionsList: ElementRef;
  @Output() addMention: EventEmitter<InsertMentionOperation> =
    new EventEmitter();

  showMenuObs$: Observable<boolean>;
  @Input() width = 'calc( 100% - 2.4rem )';
  @Input() left = 'unset';
  @Input() marginTop = '0px';
  @Input() focusSearch = false;
  @Input() mouseWithin = false;
  calculatedMarginTop = '0px';
  @Input() id: number;
  @Input() container: HTMLElement;
  focusChecker: NodeJS.Timer;
  constructor(
    private interpolatingTextFormControlService: BuilderAutocompleteMentionsDropdownService,
    private store: Store,
    private cd: ChangeDetectorRef,
    private matDialog: MatDialog
  ) {
    this.showMenuObs$ = this.store.select(BuilderSelectors.selectViewMode).pipe(
      take(1),
      switchMap((val) => {
        if (val === ViewModeEnum.VIEW_INSTANCE_RUN) {
          return of(false);
        }
        return this.interpolatingTextFormControlService.currentAutocompleteInputId$
          .asObservable()
          .pipe(
            map((val) => {
              debugger;
              return val === this.id;
            }),
            tap((val) => {
              if (val) {
                this.calculateDropdownOffset();
                this.setFocusChecker();
              }
            })
          );
      })
    );
  }
  mentionEmitted(mention: InsertMentionOperation) {
    this.interpolatingTextFormControlService.mentionEmitted.next({
      id: this.interpolatingTextFormControlService.currentAutocompleteInputId$
        .value!,
      insert: mention,
    });
  }
  private setFocusChecker() {
    if (this.focusChecker) {
      clearInterval(this.focusChecker);
    }
    this.focusChecker = setInterval(() => {
      if (
        !this.interpolatingTextFormControlService
          .currentAutoCompleteInputContainer$.value ||
        (!this.interpolatingTextFormControlService.currentAutoCompleteInputContainer$.value.matches(
          ':focus-within'
        ) &&
          this.matDialog.openDialogs.length === 0 &&
          !this.mouseWithin)
      ) {
        clearInterval(this.focusChecker);
        this.close();
      }
    }, 100);
  }

  close() {
    this.interpolatingTextFormControlService.currentAutocompleteInputId$.next(
      null
    );
    this.interpolatingTextFormControlService.currentAutoCompleteInputContainer$.next(
      null
    );
  }

  calculateDropdownOffset() {
    setTimeout(() => {
      if (
        this.mentionsList &&
        this.interpolatingTextFormControlService.currentAutocompleteInputId$
          .value === this.id
      ) {
        const containerRect = this.container.getBoundingClientRect();
        const MENTIONS_DROPDOWN_HEIGHT =
          this.mentionsList.nativeElement.getBoundingClientRect().height;
        const editStepSectionRect =
          this.interpolatingTextFormControlService.editStepSection?.nativeElement?.getBoundingClientRect() || {
            top: 0,
            height: window.innerHeight,
          };
        const thereIsSpaceBeneath =
          editStepSectionRect.top +
            editStepSectionRect.height -
            containerRect.top -
            containerRect.height -
            MENTIONS_DROPDOWN_HEIGHT >
          0;
        if (!thereIsSpaceBeneath) {
          const offsetFromAboveContainer = 5;
          this.calculatedMarginTop =
            (containerRect.height +
              offsetFromAboveContainer +
              MENTIONS_DROPDOWN_HEIGHT) *
              -1 +
            'px';
        } else {
          this.calculatedMarginTop = this.marginTop;
        }
        this.cd.markForCheck();
      } else {
        this.calculatedMarginTop = this.marginTop;
      }
    }),
      100;
  }
}
