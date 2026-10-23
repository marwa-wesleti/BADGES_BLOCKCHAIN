import { Injectable, computed, signal } from '@angular/core';
import { AppConfig, Fact, TxInfo } from './models';
import { formatDate } from './util';

export type StepName = 'register' | 'complete' | 'issue' | 'anchor';

/** Etat partage entre les 4 etapes : qui est l'eleve, quel cours, ce qui est deja fait. */
@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly config = signal<AppConfig | null>(null);
  readonly email = signal('alice@example.com');
  readonly wallet = signal('');
  /** Cle privee de l'eleve : gardee en memoire seulement, le temps de l'afficher une fois. */
  readonly privateKey = signal('');
  readonly courseId = signal('');
  readonly anchoredHash = signal('');
  readonly done = signal<Record<StepName, boolean>>({ register: false, complete: false, issue: false, anchor: false });

  /** Numero (0 a 3) de la premiere etape non terminee ; -1 quand tout est fait. */
  readonly activeStep = computed(() => {
    const d = this.done();
    return [d.register, d.complete, d.issue, d.anchor].findIndex((finished) => !finished);
  });

  markDone(step: StepName): void {
    this.done.update((d) => ({ ...d, [step]: true }));
  }

  /** Lien Etherscan, ou undefined sur un reseau local (les liens n'auraient aucun sens). */
  explorerUrl(kind: 'tx' | 'address', value: string | null | undefined): string | undefined {
    const base = this.config()?.explorer;
    return base && value ? `${base}/${kind}/${value}` : undefined;
  }

  /** Lignes "transaction / bloc / date" communes a la delivrance d'un badge et a la gravure d'une empreinte. */
  txFacts(tx: TxInfo): Fact[] {
    const facts: Fact[] = [];
    if (tx.txHash) {
      facts.push({ label: 'Transaction', text: `${tx.txHash.slice(0, 8)}…${tx.txHash.slice(-6)}`, href: this.explorerUrl('tx', tx.txHash) });
    }
    if (tx.blockNumber != null) {
      facts.push({ label: 'Bloc', text: String(tx.blockNumber) });
    }
    if (tx.blockTime) {
      facts.push({ label: 'Date du bloc', text: formatDate(tx.blockTime) });
    }
    return facts;
  }
}
