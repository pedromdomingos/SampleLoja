# SAMPLE — E-commerce Rock

Projeto escolar de e-commerce desenvolvido com Node.js, Express, EJS e SQLite.

## Rodar

```bash
npm install
npm start
```

Acesse: `http://localhost:3000`

## Principais módulos

- Login e sessões (administrador, funcionário e cliente)
- Cadastro de cliente separado do endereço (endereço em Configurações e na compra)
- Área administrativa (painel, produtos, categorias e usuários)
- Admin e funcionário também veem a loja
- Categorias com tipo de produto
- Produtos com campos específicos por categoria
- Upload de imagens
- Página inicial da loja (categorias, mais vendidos e promoções de exemplo)
- Páginas de Roupas, Instrumentos e Discos com ordenar e filtros, busca e detalhes do produto
- Carrinho, finalização da compra (CPF, frete e pagamento simulado) e acompanhamento da entrega
- Painel de pedidos e tabela de frete editável

## Identidade visual

A interface segue a direção visual da prototipação: fundo escuro, vinho/vermelho, mostarda, bege e títulos condensados.

## Produto por tipo

- **Roupa:** tamanho, cor, material e modelagem.
- **Instrumento:** tipo, marca, modelo, cordas, corpo, escala, captadores e ponte. Para guitarra, número de cordas e captadores são obrigatórios.
- **Disco/Vinil:** formato, velocidade e edição.

A SAMPLE vende somente produtos novos e todos são da própria loja, portanto não há campo de condição nem de fornecedor.
