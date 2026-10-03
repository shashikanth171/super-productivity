import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { PlainspaceConnectDialogComponent } from './plainspace-connect-dialog.component';
import { PlainspaceAccountService } from '../plainspace-account.service';
import { T } from '../../../t.const';

describe('PlainspaceConnectDialogComponent', () => {
  let component: PlainspaceConnectDialogComponent;
  let fixture: ComponentFixture<PlainspaceConnectDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<PlainspaceConnectDialogComponent, boolean>>;
  let accountService: jasmine.SpyObj<PlainspaceAccountService>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    accountService = jasmine.createSpyObj('PlainspaceAccountService', ['connect']);

    await TestBed.configureTestingModule({
      imports: [
        PlainspaceConnectDialogComponent,
        NoopAnimationsModule,
        TranslateModule.forRoot(),
      ],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { host: 'https://plainspace.org' } },
        { provide: PlainspaceAccountService, useValue: accountService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlainspaceConnectDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders and uses the provided host', () => {
    expect(component).toBeTruthy();
    // A signal: the deployment's PLAINSPACE_HOST settles after construction, so
    // the value is read, not captured.
    expect(component.host()).toBe('https://plainspace.org');
  });

  it('renders the connect link with a resolved URL, not a stringified signal', () => {
    // Regression guard for the bug the template shipped: `[href]="connectUrl"`
    // passed the computed's FUNCTION to the sanitizer, which stringified it, so
    // the anchor pointed at `...?()=>{if(Jt(n),...)throw n.error;...}` — the
    // minified source of the signal accessor. Angular does not type-check a
    // missing call, so only a rendered-DOM assertion catches it.
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a[href]') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe(
      'https://plainspace.org/connect/super-productivity',
    );
  });

  it('points the connect link at the deployment host once resolved', () => {
    component.host.set('https://plainspace.apps.swecha.org');
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a[href]') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe(
      'https://plainspace.apps.swecha.org/connect/super-productivity',
    );
  });

  it('does nothing when the token is blank', async () => {
    component.token = '   ';
    await component.connect();
    expect(accountService.connect).not.toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('connects with the trimmed token and closes with true on success', async () => {
    accountService.connect.and.resolveTo('ok');
    component.token = '  pat_abc  ';
    await component.connect();
    expect(accountService.connect).toHaveBeenCalledWith(
      'pat_abc',
      'https://plainspace.org',
    );
    expect(dialogRef.close).toHaveBeenCalledWith(true);
    expect(component.errorMsg()).toBeNull();
  });

  it('shows the rejected-token message and stays open on an invalid token', async () => {
    accountService.connect.and.resolveTo('invalid-token');
    component.token = 'bad';
    await component.connect();
    expect(component.errorMsg()).toBe(T.PLAINSPACE.CONNECT.INVALID);
    expect(component.isConnecting()).toBe(false);
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  // #9988: a request that never reached Plainspace must not be blamed on the
  // token — that is what sent users into an endless re-copy loop.
  it('shows the unreachable message when the host could not be reached', async () => {
    accountService.connect.and.resolveTo('unreachable');
    component.token = 'pat_abc';
    await component.connect();
    expect(component.errorMsg()).toBe(T.PLAINSPACE.CONNECT.UNREACHABLE);
    expect(component.isConnecting()).toBe(false);
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('stays silent when the attempt was aborted by a disconnect', async () => {
    accountService.connect.and.resolveTo('aborted');
    component.token = 'pat_abc';
    await component.connect();
    expect(component.errorMsg()).toBeNull();
    expect(component.isConnecting()).toBe(false);
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('cancel closes with false', () => {
    component.cancel();
    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });
});
