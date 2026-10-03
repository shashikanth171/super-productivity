import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatAnchor, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { T } from '../../../t.const';
import { IS_ELECTRON } from '../../../app.constants';
import {
  PlainspaceAccountService,
  PlainspaceConnectResult,
} from '../plainspace-account.service';
import { DEFAULT_PLAINSPACE_CFG } from '../../issue/providers/plainspace/plainspace-cfg-form.const';
import { resolveDefaultPlainspaceHost } from '../../issue/providers/plainspace/plainspace-default-host.util';

export interface PlainspaceConnectDialogData {
  host?: string | null;
}

/**
 * Value-first "Connect to Plainspace" dialog: leads with what you get, links out
 * to Plainspace to create a personal API token, then takes the pasted token and
 * validates it against the host before closing. Resolves to `true` once
 * connected, `false` if the user cancels.
 */
@Component({
  selector: 'plainspace-connect-dialog',
  templateUrl: './plainspace-connect-dialog.component.html',
  styleUrls: ['./plainspace-connect-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    FormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatButton,
    MatAnchor,
    MatIcon,
    TranslatePipe,
  ],
})
export class PlainspaceConnectDialogComponent {
  private _dialogRef =
    inject<MatDialogRef<PlainspaceConnectDialogComponent, boolean>>(MatDialogRef);
  private _accountService = inject(PlainspaceAccountService);
  private _data = inject<PlainspaceConnectDialogData | null>(MAT_DIALOG_DATA, {
    optional: true,
  });

  readonly T = T;
  // Resolves the deployment's PLAINSPACE_HOST when the caller passes no host, so a
  // self-hosted instance links to its own connect page instead of plainspace.org.
  // Starts as the hosted default and settles once the override asset answers — the
  // dialog is rendered synchronously by MatDialog, so the async value cannot be
  // part of a field initializer the way it was before.
  readonly host = signal(this._data?.host ?? DEFAULT_PLAINSPACE_CFG.host ?? '');
  // Deep link to the dedicated "from Super Productivity" onboarding flow, which
  // guides token creation — instead of dropping the user on the bare marketing
  // host. Trailing slash stripped so we never produce a double slash.
  //
  // On desktop we also pass a `?return=` deep link so the connect page can bounce
  // the user back to the app. Only Electron registers the `superproductivity://`
  // scheme (mobile uses a different one, web none), so gate it on IS_ELECTRON —
  // otherwise the page would render dead "Open Super Productivity" buttons.
  readonly connectUrl = computed(
    () =>
      `${this.host().replace(/\/+$/, '')}/connect/super-productivity` +
      (IS_ELECTRON
        ? `?return=${encodeURIComponent('superproductivity://plainspace-connect')}`
        : ''),
  );

  constructor() {
    // Only when the caller gave no host: an explicit host is the caller's choice
    // and must win. Resolved here rather than inside connect() so token
    // validation stays a single request with no asset fetch in front of it.
    if (!this._data?.host) {
      void resolveDefaultPlainspaceHost().then((host) => {
        if (host) {
          this.host.set(host);
        }
      });
    }
  }
  token = '';
  readonly isConnecting = signal(false);
  // The failure to show, or null for none. `aborted` is deliberately silent:
  // the user disconnected mid-check, so there is nothing to warn them about.
  readonly error = signal<'invalid-token' | 'unreachable' | null>(null);
  readonly errorMsg = computed(() => {
    const err = this.error();
    return err === 'unreachable'
      ? T.PLAINSPACE.CONNECT.UNREACHABLE
      : err === 'invalid-token'
        ? T.PLAINSPACE.CONNECT.INVALID
        : null;
  });

  async connect(): Promise<void> {
    const token = this.token.trim();
    if (!token || this.isConnecting()) {
      return;
    }
    this.isConnecting.set(true);
    this.error.set(null);
    const res: PlainspaceConnectResult = await this._accountService.connect(
      token,
      this.host(),
    );
    if (res === 'ok') {
      this._dialogRef.close(true);
      return;
    }
    this.error.set(res === 'aborted' ? null : res);
    this.isConnecting.set(false);
  }

  cancel(): void {
    this._dialogRef.close(false);
  }
}
