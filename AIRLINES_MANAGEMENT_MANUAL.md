# Manual Operacional e Arquitetura de Gerenciamento de Companhias Aéreas
## Sistema MALHA - Aeroporto Internacional de Guarulhos (SBGR) / Vibra BR Aviation

---

### 1. Visão Geral e Arquitetura do Sistema (ASCII Architecture)

```
+====================================================================================================+
|                                     SISTEMA MALHA - NÚCLEO JETFUEL                                 |
+====================================================================================================+
                                                  |
                    +-----------------------------+-----------------------------+
                    |                                                           |
                    v                                                           v
       [ MÓDULO MALHA OPERACIONAL ]                                [ MÓDULO CADASTROS BASE ]
        - Voos Diários & Programação                                - Aeródromos (SBGR, etc.)
        - Monitoramento de Pátios & Slots                           - Operadores / Frotistas
        - Abastecimento & Faturamento                               - Companhias Aéreas (Airlines)
                    |                                                           |
                    +-----------------------------+-----------------------------+
                                                  |
                                                  v
                               +-------------------------------------+
                               |   GERENCIAMENTO DE COMPANHIAS       |
                               |   (AirlinesAdmin.tsx)               |
                               +-------------------------------------+
                                                  |
                         +------------------------+------------------------+
                         |                                                 |
                         v                                                 v
           [ LISTAGEM MESTRE EM GRID ]                      [ DETALHAMENTO & FROTA ]
           - Status Ativo / Inativo                         - (AirlineFleetDetail.tsx)
           - Contadores Dinâmicos                           - Modelos de Aeronaves
           - Busca Inteligente de Matrículas                - Prefixos / Registros
           - Edição Rápida de Células                       - Configuração de Tanques
           - Importação em Lote (.XLSX)                     - Regras de Inatividade (Bloqueio)
                         |                                                 |
                         +------------------------+------------------------+
                                                  |
                                                  v
                               +-------------------------------------+
                               |         CAMADA SUPABASE (SSoT)      |
                               | - Tabela: `airlines`                |
                               | - Tabela: `airline_fleet`           |
                               | - Relacionamentos FK com `flights`  |
                               +-------------------------------------+
```

---

### 2. Tabela de Estados e Efeitos Visuais

| Componente | Estado Ativo | Estado Inativo (Desabilitada) |
| :--- | :--- | :--- |
| **Linha na Tabela Mestre** | Fundo neutro com hover suave | Fundo avermelhado sutil (`bg-red-950/20` / `bg-red-50/60`), bordas em tom rubro |
| **Contadores no Topo** | Tag Esmeralda (`Ativos: N`) com pulso verde | Tag Carmim (`Inativos: N`) com ponto de alerta vermelho |
| **Botão de Ação na Linha** | Botão Amarelo **Editar** (`#FEDC00`) com ícone | Botão Amarelo **Editar** (`#FEDC00`) com ícone |
| **Painel de Frota / Detalhe** | Todas as ações liberadas (adicionar, excluir) | Modo Bloqueado / Read-Only; Botão de Status vermelho |
| **Botão Ativo / Inativo** | Estilo padrão com indicador | Borda avermelhada, tipografia e fundo rubro |

---

### 3. Manual Passo a Passo de Operações

#### 3.1. Cadastrar Nova Companhia Aérea
1. Na tela de **Companhias Aéreas**, clique no botão **Opções** (amarelo) no cabeçalho superior direito.
2. Selecione **Nova Companhia**.
3. Uma nova linha vazia será criada na grade de dados.
4. Preencha os campos obrigatórios clicando na respectiva célula:
   - **Razão Social:** Nome empresarial registrado (ex.: `LATAM AIRLINES BRASIL`).
   - **Comp:** Nome comercial/fantasia usual (ex.: `LATAM`).
   - **Cód. da Comp:** Código IATA/ICAO de 2 ou 3 dígitos (ex.: `LA`, `JJ`, `TAM`).
   - **País/Região:** Nacionalidade da companhia aérea (ex.: `BRASIL`, `ESTADOS UNIDOS`).
   - **Ativo:** Caixa de seleção marcando a validade operacional da empresa.
5. As alterações são gravadas instantaneamente no banco de dados Supabase via *optimistic update*.

#### 3.2. Gerenciar a Frota de Aeronaves de uma Companhia
1. Na tabela mestre, localize a companhia desejada.
2. Clique no botão amarelo **Editar** (ou dê duplo clique na linha da companhia).
3. O painel detalhado de **Frota da Companhia** será aberto.
4. **Para adicionar uma aeronave:**
   - Preencha a Matrícula (ex.: `PR-XTD`), Modelo (ex.: `A350-900`) e Capacidade volumétrica.
   - Pressione Enter ou clique em **Adicionar**.
5. **Para alterar dados de aeronave cadastrada:**
   - Clique diretamente na célula correspondente na tabela da frota para edição em tempo real.

#### 3.3. Inativar / Reativar uma Companhia
1. **Via Tabela Mestre:** Desmarque o checkbox na coluna **Ativo**. A linha adotará imediatamente o layout avermelhado suave e os contadores de *Ativos* / *Inativos* no cabeçalho serão recalculados.
2. **Via Modal da Frota:** Clique no botão no canto superior direito do painel de frota. O botão mudará para o tema avermelhado de inatividade, bloqueando operações críticas de frota para prevenir inconsistências na malha.

#### 3.4. Importação em Lote via Excel (.xlsx / .xls)
1. Clique em **Opções** -> **Instruções de Importação** para consultar o layout das colunas.
2. Clique em **Opções** -> **Importar Excel**.
3. Selecione a planilha formatada contendo as colunas de Companhias e Frotas associadas.
4. O sistema processará o arquivo e atualizará a base de dados mantendo a integridade referencial.

#### 3.5. Busca Rápida e Inteligente de Aeronaves
1. No campo de busca **BUSCAR AERONAVE...** no cabeçalho superior, digite parte do prefixo da aeronave (ex.: `XTD` ou `PT-M`).
2. O sistema filtrará instantaneamente a lista de companhias para exibir apenas as empresas que possuem aeronaves correspondentes em sua frota ativa.

---

### 4. Modelo de Dados e Esquema Relacional

```sql
-- Tabela de Companhias Aéreas
CREATE TABLE public.airlines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    airline VARCHAR(100) NOT NULL,
    airline_code VARCHAR(10) NOT NULL UNIQUE,
    legal_name VARCHAR(255),
    country VARCHAR(100) DEFAULT 'BRASIL',
    is_active BOOLEAN DEFAULT true,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Frota Vinculada
CREATE TABLE public.airline_fleet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    airline_id UUID REFERENCES public.airlines(id) ON DELETE CASCADE,
    registration VARCHAR(20) NOT NULL,
    aircraft_type VARCHAR(50),
    max_fuel_capacity NUMERIC(12,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

---

*Sistema MALHA - Engenharia e Arquitetura de Software*
