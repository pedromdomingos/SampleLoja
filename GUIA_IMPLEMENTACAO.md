# SAMPLE — Etapa 1 / versão personalizada

## Alterações solicitadas

1. **Endereço separado do cadastro**: `/cadastro` cria somente a conta do cliente e já deixa o cliente logado na loja. O endereço de entrega é cadastrado depois, em **Minha conta → Configurações** (`/conta/configuracoes`), permitindo vários endereços por cliente. Logo após criar a conta aparece um aviso (que pode ser fechado) lembrando de cadastrar o endereço.
2. **Identidade visual inspirada na prototipação do Figma**: preto/marrom escuro, vinho, vermelho rock, mostarda, bege e tipografia condensada para títulos.
3. **Produtos**: descrição e gênero são obrigatórios. Não existe campo de condição: a SAMPLE vende somente produtos novos.
4. **Campos específicos por tipo**: cada categoria possui um tipo (`roupa`, `instrumento`, `disco`, `outros`). O cadastro de produto usa esse tipo para exibir campos específicos.

5. **Sem fornecedor**: todos os produtos são da própria SAMPLE. O perfil, as telas, as rotas e o campo de fornecedor foram removidos. Bancos antigos são ajustados sozinhos na primeira execução (colunas `fornecedor_id` e `condicao` removidas e contas de fornecedor apagadas).
6. **Admin e funcionário veem a loja**: o menu do painel e a tela inicial do painel têm "Ver loja"; na loja eles têm o botão "Voltar ao painel" (sem botão de comprar).
7. **Cliente entra na loja**: depois do login o cliente vai para a página inicial (e não mais para Minha conta).
8. **Compra exige endereço** (`/checkout/endereco`): sem endereço cadastrado o cliente precisa criar um; com endereço, escolhe um dos cadastrados ou cadastra outro. O carrinho e o resumo dos itens entram nas próximas etapas.
9. **Página inicial** seguindo o Figma: hero, categorias, mais vendidos, promoções, manifesto, newsletter e rodapé. Os produtos são exemplos fixos (`util/exemplos.js`) e a vitrine passa a vir do banco na 2ª etapa.

10. **Alinhado às Regras de Negócio entregues (Entrega 3)**:
    - **RN6** senha com no mínimo 8 caracteres (cadastro, usuários internos e recuperação de senha).
    - **RN23** administrador e funcionário podem excluir produtos e categorias.
    - **RN35** o peso do produto é obrigatório (o frete será calculado a partir dele).
    - **RN15** o complemento do endereço é obrigatório; quem não tem marca "Sem complemento".
    - **RN38** o cliente exclui a própria conta em Configurações, confirmando com a senha.
    - **RN8** recuperar senha por código: em `/recuperar-senha`. O envio de e-mail é **simulado** (o código aparece na tela e no terminal, vale 15 minutos e tem no máximo 5 tentativas). Para enviar e-mail de verdade, troque o trecho "E-MAIL SIMULADO" em `rotas/auth.js` por um envio com `nodemailer`.
    - **RN2** o administrador continua cadastrando funcionários em Usuários.
    - Fica para depois: shows de rock na região (Plano de Projeto), cupons, carrinho e pedidos.
11. **Loja**: fonte Alumni Sans no site todo; navbar transparente sobre o mesmo degradê do topo; cartaz grande com fotos que troca sozinho (5 s) entre a barra de links e as categorias; categorias com foto; Mais vendidos e Promoções em carrossel infinito. As fotos ficam em `public/img` (recortadas das prints do Figma ou ilustradas); para trocar, substitua o arquivo mantendo o nome.
12. **Criar admin ou funcionário**: nome, CPF, e-mail, telefone, senha e confirmar senha são obrigatórios.

13. **CPF só na compra**: saiu do cadastro e do endereço. É pedido ao finalizar a compra e fica salvo na conta (não precisa digitar de novo). Criar admin ou funcionário continua exigindo CPF.
14. **Produtos de teste**: na primeira execução (se não houver nenhum produto) são criados 15 produtos e as categorias, com fotos copiadas de `public/img` para `public/uploads`. Estão em `util/produtos-teste.js`. Na home, **Mais vendidos** são os produtos marcados como destaque e **Promoções** os que têm valor promocional.
15. **Ordem por ID**: categorias e produtos aparecem em ordem crescente de ID (painel e formulários).
16. **Logo**: `public/img/logo-nav.png` e `logo-rodape.png` foram recortados das prints. Para usar o arquivo original, substitua os dois mantendo o nome.
17. **Ondas** no fim da home e de todas as páginas da loja (`.onda` no CSS, formato em `public/img/onda.svg`) e **WhatsApp** no rodapé (número em `app.js`, constante `WHATSAPP`).

## Mapa de telas

| # | Tela | Endereço | Situação |
|---|---|---|---|
| 1 | Tela principal | `/` | pronta (vitrine vem do banco) |
| 2 | Carrinho | `/carrinho` | **nova** |
| 3 | Cadastro | `/cadastro` | pronta (sem CPF) |
| 4 | Login | `/login` | pronta |
| 5 | Recuperação de senha | `/recuperar-senha` | pronta (e-mail simulado) |
| 6 | Itens por categoria | `/loja/roupas`, `/loja/instrumentos`, `/loja/discos` | **nova** (ordenar e filtros) |
| 7 | Detalhes do produto | `/produto/:id` | **nova** |
| 8 | Endereço | `/checkout/endereco` e `/conta/configuracoes` | pronta |
| 9 | Finalizar compra | `/checkout/resumo` | **nova** (CPF, frete, pagamento) |
| 10 | Acompanhar entrega | `/pedidos` e `/pedidos/:id` | **nova** (linha do tempo e rastreio) |
| - | Busca | `/busca?q=` | **nova** |
| - | Painel: pedidos e frete | `/admin/pedidos` e `/admin/frete` | **novas** |

## Como funciona a compra

1. O cliente adiciona produtos ao carrinho (visitantes também; o carrinho fica guardado ao entrar na conta).
2. **Finalizar compra**: escolhe ou cadastra o endereço, informa o CPF e escolhe PIX, cartão ou boleto (todos simulados).
3. O pedido nasce **Aguardando pagamento**, o estoque é reduzido e o **código de rastreio é gerado** (RN25 e RN27).
4. O cliente usa **Simular pagamento** e o pedido vira **Pago**. Só então o painel pode avançar: Em separação, Enviado e Entregue (RN31 e RN32).
5. O cliente (ou a loja) cancela até o pedido ser enviado; o estoque volta e, se já estava pago, o valor é devolvido (simulado) (RN26 e RN33).

**Frete**: valor base da região + valor por kg × kg do pedido (peso total arredondado para cima, mínimo 1 kg). A região vem do estado do endereço. Admin e funcionário mudam os valores em **Frete**, a qualquer momento (vale para os próximos pedidos).

**Ficam para depois**: cupons, shows de rock na região, editar produtos e avaliações reais (as estrelas dos produtos de teste são fixas).

## Perfis de acesso

| Perfil | Entra em | Pode |
|---|---|---|
| Administrador | `/admin/index` | Produtos, categorias (cadastrar e excluir), pedidos, frete, usuários e ver a loja |
| Funcionário | `/admin/index` | Produtos, categorias (cadastrar e excluir), pedidos, frete e ver a loja |
| Cliente | `/` (loja) | Comprar, acompanhar pedidos, Minha conta e Configurações (endereços) |

## Tipos de categoria e especificações

Todo produto pertence a uma categoria, e a categoria tem um **tipo** que define as especificações do produto.
Tudo fica em **`util/tipos.js`**: o formulário de produto, a validação e as colunas do banco leem esse arquivo.
Para mudar uma especificação (ou criar um tipo novo), edite só esse arquivo; as colunas do banco são criadas sozinhas.

| Tipo | Obrigatórias | Opcionais |
|---|---|---|
| Roupas | tamanho, cor, material | modelagem |
| Guitarras | marca, modelo, nº de cordas, captadores | ponte, material do corpo, material da escala |
| Baixos | marca, modelo, nº de cordas, captadores | material do corpo, material da escala |
| Baterias | marca, modelo, nº de peças, material do casco, vem com pratos e ferragens | cor / acabamento |
| Violões | marca, modelo, nº de cordas, tipo de corda | material do tampo |
| Outros instrumentos | tipo (teclado, pedal, amplificador, acessório, outro), marca, modelo | - |
| Discos / Vinis | formato, velocidade, edição | - |

O tipo "Outros" foi removido da criação de categorias (categorias antigas desse tipo continuam funcionando).

## Informações do produto

- **Obrigatórias:** nome, categoria, ano de lançamento, descrição, imagem, valor, estoque e peso, além das especificações obrigatórias do tipo.
- **Opcionais:** artista, gênero, gravadora, valor promocional e destaque.
- O tipo do produto vem da categoria escolhida (o servidor consulta o banco, não confia no formulário).

## Categorias iniciais (banco novo)

Roupas, Guitarras, Baixos, Baterias, Violões, Outros instrumentos e Discos / Vinis.
Em bancos antigos, categorias "instrumento" com nome de guitarra, baixo, bateria ou violão são ajustadas sozinhas para o tipo específico.

## Execução

```bash
npm install
npm start
```

Depois acesse `http://localhost:3000`.

Contas de demonstração (já nascem no banco; senhas novas precisam ter 8 caracteres ou mais):
- `admin@sample.com` / `admin123`
- `funcionario@sample.com` / `123456`
- `cliente@sample.com` / `123456`
