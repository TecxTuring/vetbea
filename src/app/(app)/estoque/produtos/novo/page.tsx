import { PageHeader } from "@/components/ui";
import { ProdutoForm } from "../../produto-form";
import { criarProduto } from "../../actions";

export const metadata = { title: "Novo produto" };

export default function NovoProduto() {
  return (
    <>
      <PageHeader title="Novo produto ou serviço" back="/estoque" />
      <ProdutoForm action={criarProduto} />
    </>
  );
}
