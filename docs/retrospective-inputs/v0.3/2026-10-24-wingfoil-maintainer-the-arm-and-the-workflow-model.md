# Retrospective input — the WingFoil maintainer on the wingfoil arm and WingFoil's workflow model

**Received:** 2026-10-24, from the approver in chat, during v0.3's delivery (task-101's review).
**For:** the retrospective of release v0.3 (`release-cycle` › `retrospective`, rel-v0-3).
**Status:** input only. Nothing was changed because of it (manual, arm, runner untouched); the retrospective decides
whether and how it reaches the next release, under the benchmark's own rules (experiment design, calibration, parity
between arms). Much of it overlaps dl-021 (steps A, B, C) and plan-005's W17; the new points are WingFoil's dl-203
(D1–D3, the `coordinator` role), dl-171, bug-413, bug-392 and the Determinism Index's *P* read from the workflow.

The message as received, in its original language (Italian), unedited:

---

Messaggio dal maintainer di WingFoil (repository pubblico `wingfoil/wingfoil`) alla sessione di **retrospective**
del benchmark. Va considerato come **input della retrospective**: decidete voi, con le vostre regole (experiment
design, calibrazione, confronto equo tra i bracci), se e come portarlo nella **prossima release del benchmark**.
Il risultato atteso è una correzione del **manuale** (`arms/wingfoil/manual.md`) e del **braccio**
(`arms/wingfoil/arm.yaml`, `setup.sh`, ed eventualmente il runner), coerente con il modello di lavoro descritto qui sotto
e sincronizzata con le versioni di WingFoil elencate in fondo.

## 1. Perché

Il braccio wingfoil di oggi usa WingFoil come **registro documentale**: un agente con un ruolo fisso
(`developer`), che per ogni richiesta apre un task e una decision-log con `memory add` e `memory submit`, e che
avvia un workflow «solo se la richiesta lo chiede». Con questo uso il **motore di workflow** di WingFoil non viene
esercitato: nessuna istanza viene avviata, nessuno step viene dedotto, e il ruolo non viene mai preso dallo step.
Eppure `arm.yaml` dichiara `workflow-engine: true`. Il benchmark misura quindi WingFoil senza la parte che lo
distingue: un processo deterministico guidato dal workflow.

C'è anche un limite del tool da conoscere: in **0.3.0** il workflow scaffold di `init --template Kanban` non dichiara
ruolo, azioni o evidenze sulle sue fasi (bug-400). Su un progetto fresco il motore quindi **non guida nulla**.
Il problema è corretto in 0.3.1 (vedi §4).

## 2. Il modello di lavoro con WingFoil

Lavorare su un progetto gestito con WingFoil vuol dire alternare in sequenza tre cose:

- **comandi `wingfoil`**, per sapere dove si è e registrare il passaggio;
- **la scrittura degli elementi di Memory**, cioè il loro contenuto;
- **esecuzioni di agenti**, che fanno il lavoro di uno step (implementazione, review, …) e vengono lanciate anch'esse
  da `wingfoil`.

Il ciclo è questo:

1. `wingfoil workflow status`: le istanze aperte. Se non ce n'è una per il lavoro richiesto, il driver la apre con
   `wingfoil workflow start <workflow> [--element <type>:<id>]`. In 0.3 apre un elemento `plan`.
2. `wingfoil workflow next`: lo step successivo, con il suo **ruolo**, le direttive di quel ruolo, l'elemento su cui
   lavora e il comando o commit che ogni azione si aspetta. In caso di parallelismo la frontiera può contenere più
   step.
3. **Il lavoro dello step**, svolto nel ruolo dello step e non in un ruolo fisso:
   - con le verbs: `memory add --workflow <ref> --step <key>`, così il motore collega l'elemento allo step;
   - con `memory submit` per il contenuto;
   - con `wingfoil agent execute --next` (oppure `--workflow`/`--step`), che lancia l'agente configurato con il
     contesto del ruolo e dell'elemento già caricato e registra l'esecuzione nel run log.
4. **Gate di approvazione.** Uno step che attende un'approvazione si ferma e passa la mano all'approver: approve e
   reject sono **sempre decisioni umane**. Nel benchmark resta valida la vostra regola dell'approver fisso: l'agente
   esegue la risposta, non decide.
5. **Step senza evidenza.** Uno step che nessun elemento o file può completare si chiude con
   `wingfoil workflow finalize --step <key>`.
6. Si torna al punto 2 finché `workflow next` non dice che l'istanza è completa, poi `wingfoil workflow end`.

Lo stato di un'istanza **non è memorizzato**: WingFoil lo **deduce** a `HEAD` dallo stato degli elementi, dalla storia
dei commit e dai record di `finalize`. Per questo ogni passaggio deve passare per le verbs e finire in un commit.

Al netto della scrittura degli elementi, che può fare anche un agente lanciato direttamente, il resto del ciclo è
**lavoro meccanico da terminale**, con l'eccezione dei gate.

**Chi esegue le operazioni meccaniche, oggi e domani:**

- **Oggi (0.3.x)** WingFoil **traccia e instrada ma non esegue gli step**. Inoltre `agent execute` lancia solo in
  modalità **interattiva**: l'agente occupa un terminale e non esce da solo a lavoro finito. In un container senza
  TTY, quindi, il ciclo può essere guidato solo **dall'agente stesso**: la sessione esegue `status`, `next`, lo step
  nel ruolo indicato, le verbs, e si ferma ai gate.
- **Direzione del progetto (v1.0, P4.10/P4.12):** è il **motore** a eseguire gli step meccanici (operazioni di Memory,
  git, lancio degli agenti) e i check. L'LLM resta **dentro** gli step.
- **Decisione ratificata, `dl-203` (`ready`, 2026-10-24):**
  - **D1:** il driver di un run è il **motore**, non un LLM. Il comando sarà `wingfoil workflow run [<instance>]`, con
    `--once` e `--dry-run`, che esegue la frontiera fino a un gate, una parte esterna, un fallimento o la fine. Arriva
    in **v1.0** con P4.10/P4.12; in v0.4 arrivano solo i prerequisiti.
  - **D2:** un agente **coordinatore** è opzionale, sottile e dichiarato come ruolo `coordinator`, con le sue
    direttive. Decide solo i punti di giudizio: quali step della frontiera eseguire in parallelo, il triage di un
    fallimento, il contenuto che nessun altro ruolo scrive. Non esegue alcun comando che il driver sa eseguire e non ha
    alcuna autorità sui gate. Il ruolo e la sua direttiva entrano in v0.4.
  - **D3:** finché il driver non esiste, il run si guida **a mano**, da un umano o dall'agente dell'utente. Il ciclo del
    §2 viene descritto nella guida per agenti (`docs/agents.md` §7) e nella user guide in **v0.4**. Un agente che lo
    segue è un run *guidato a mano*, non un coordinatore.

  Per il braccio vale quindi: il **passo A** del §4 corrisponde a D3. Al passo C l'agente non coordina: risponde ai
  gate, e al massimo prende i punti di giudizio nel ruolo `coordinator`.

## 3. Cosa chiedo alla retrospective

Valutate e, se lo accettate, pianificate per la prossima release:

1. **Il manuale** (`arms/wingfoil/manual.md`). Oggi segue la guida per agenti 0.3.0 (`docs/agents.md` di WingFoil,
   §7 «Following a workflow»), ma ne disattiva il §7. Va riscritto attorno al ciclo del §2:
   - il ruolo viene da `workflow next`, non è fisso a `developer`;
   - gli elementi si creano con `--workflow`/`--step`;
   - ci si ferma ai gate;
   - si usa `finalize` per gli step senza evidenza.

   La regola «start o end di un workflow solo se la richiesta lo chiede» va sostituita da una regola esplicita su
   **chi apre l'istanza** (lo scenario, il setup o l'agente) e su **quale workflow**. Le altre partenze dalla guida
   (configurazione non modificabile, approver fisso) restano vostre decisioni.
2. **Il braccio:**
   - `setup.sh`: il pin di WingFoil deve essere **≥ 0.3.1**, altrimenti lo scaffold Kanban non guida (bug-400).
     Valutate se il setup o lo scenario debbano dichiarare il workflow e aprire l'istanza.
   - `arm.yaml`: le `provides` devono descrivere quello che il braccio **esercita** davvero, non solo quello che il
     tool offre.
   - **Le metriche:** la conformità di processo (la *P* del Determinism Index) diventa misurabile solo se il braccio
     segue il workflow. Valutate se il benchmark debba leggerla da `workflow status`/`next` e dalla storia dei commit.
3. **L'equità tra i bracci.** Il cambiamento modifica il trattamento del braccio wingfoil. Decidete voi come
   trattarlo: nuova versione del braccio, campagna ponte, ricalibrazione.
4. **Il piano di sincronizzazione** con le versioni del §4. Indicate per ogni passo del braccio (A → B → C) la
   versione di WingFoil che lo abilita, e riportate a WingFoil come note d'uso ciò che manca o non funziona.

## 4. Cosa c'è oggi in WingFoil e cosa arriva

Fonti nel repository pubblico: `docs/04_memory/planning/rl-v1/` (le release), `docs/04_memory/design/dls/` (le
decisioni), `docs/agents.md` §9 (limiti noti). Lo stato indicato è quello delle decision-log alla data di oggi
(2026-10-24). Una decisione `in-discussion` **non è un impegno**: ricontrollatela prima di pianificarci sopra.

**0.3.0 (rilasciata, npm `latest`):**
- Memory: tutte le verbs (`add`, `submit`, `approve`, `reject`, `deprecate`, `amend`, `park`, `history`, `search`).
- Workflow: `list`, `show`, `start`, `next`, `status`, `finalize`, `end`, `create`, `remove`. Stato dedotto, **nessuno
  step eseguito**, **nessun check valutato**.
- Agenti: `agent execute` con `--next`, `--workflow`, `--step`, solo **interattivo**. Attenzione: anche `--dry-run`
  vuole un terminale con gli adapter built-in (bug-392, triaged). Ci sono poi `agent list` (`--past`, `--waiting`) e
  `agent show`, con il run log.
- MCP: Resources e Prompts; **nessun Tool** (`tools/list` risponde `[]`).
- Limite: lo scaffold di `init` non guida il motore (bug-400).

**0.3.1 (patch, in sviluppo sulla linea `release/0.3`):**
- Scaffold di `init` guidabile dal motore: ruoli, azioni ed evidenze sulle fasi (bug-400). **È il minimo per il
  passo A.**
- `workflow adopt` e `workflow rekey` (P4.21, provenienza degli elementi): servono a riconoscere elementi creati
  fuori dal workflow.
- Il ruolo `facilitator` diventa eseguibile dall'agente `Claude` (dl-202, punto 3).
- Check dichiarabili `manual` (dl-172).
- Gli scrittori di configurazione alzano il campo `version:` (dl-174).

**0.4 (in pianificazione):**
- **MCP Tools** per le mutazioni: un agente può avanzare la Memory via MCP.
- Il Tool MCP `agent.execute` e il registro delle esecuzioni attive (`agent list --active`). Per spec-016 il Tool
  **rifiuta ogni chiamata finché non esiste il lancio headless**.
- `agent execute --next` **rifiuta**, con un suggerimento, uno step in attesa di approvazione, record o altra parte
  (dl-171, ratificata). È pensato per un driver in loop.
- Check di configurazione sui ruoli che nessun agente può eseguire (dl-202, punti 1–2).
- Template di workflow di riferimento: Scrum, Kanban, Lean Inception, Trunk-Based, con espansione (P4.18–P4.20). **Lo
  scaffold Kanban usato dal braccio cambierà.**
- **Il ciclo guidato a mano descritto nelle guide** (`docs/agents.md` §7 e user guide; `dl-203` D3/Q4). È il testo di
  riferimento per riscrivere il manuale del braccio: quando esce, conviene allineare il manuale a quel testo.
- **Il ruolo `coordinator`** e la sua direttiva, dichiarati in questo repository (`dl-203` D2/Q3).
- **Il context element di `workflow start`** (bug-413, triaged v0.4):
  - `--element` su un main senza elemento imposta il context, e `--element none` lo toglie;
  - nessun context quando l'istanza attiva è a sua volta un main senza elemento.

  Interessa il braccio se il setup apre un'istanza mentre un'altra è aperta.
- Inoltre: `init --mode infer`, `audit`, `dna infer`, `memory import`; `workflow transfer`.
- **Candidati, oggi `in-discussion` e assegnati a v0.4:**
  - lancio **headless di lavoro**: un agente senza terminale, registrato dai suoi commit e dal suo exit status (dl-181);
  - chi sceglie il tipo di lancio (dl-183);
  - dove va l'output dell'agente (dl-182).

  Se dl-181 viene approvata, il runner potrà pilotare `agent execute --next` dall'esterno: è il **passo B**.

**1.0 (MVP):**
- **Esecuzione degli step** (P4.10): operazioni di Memory, git (branch, worktree, merge, commit) e lancio degli agenti
  fatti dal motore, tramite `wingfoil workflow run` (`--once`, `--dry-run`) (`dl-203` D1/Q1).
- **Runner dei check** pre/post (P4.12).
- Lancio headless di **verifica**, con verdetto via `gate.report`.
- Template built-in Task e Release (P4.17).
- Determinism Index riportato (I, P, O).

Con la 1.0 il driver diventa il motore: è il **passo C**.

**Sincronizzazione proposta per il braccio:**
- **Passo A (WingFoil ≥ 0.3.1):** l'agente guida il ciclo da sé dentro la sessione: è il run guidato a mano di
  `dl-203` D3. Con la v0.4 il manuale si allinea al testo della guida per agenti, che descriverà lo stesso ciclo.
- **Passo B (WingFoil 0.4, solo se il lancio headless entra):** il runner guida il ciclo e lancia gli agenti con
  `agent execute --next`, che dalla v0.4 si ferma ai gate (dl-171); i gate restano all'approver fisso.
- **Passo C (WingFoil 1.0):** il runner chiama `wingfoil workflow run`, il motore esegue gli step e i check, e il
  braccio si limita a rispondere ai gate. Un eventuale agente nel ruolo `coordinator` prende solo i punti di giudizio
  (`dl-203` D1/D2). Valutate se il ruolo `coordinator` debba far parte del trattamento.
