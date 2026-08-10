<script lang="ts">
    /**
     * Error page, mostly seen on a mistyped url.
     *
     * @author Claude
     */
    import Button from "flowbite-svelte/Button.svelte";
    import { resolve } from "$app/paths";
    import { page } from "$app/state";
</script>

<svelte:head>
    <title>Page introuvable</title>
</svelte:head>

<section class="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
    <p class="text-muted font-mono text-sm">{page.status}</p>

    <h1 class="mt-3 font-serif text-4xl font-semibold tracking-tight">
        {page.status === 404 ? "Cette page ne figure pas dans les archives" : "Une erreur est survenue"}
    </h1>

    <p class="text-muted mx-auto mt-4 max-w-lg leading-relaxed">
        {page.error?.message ?? "Le chemin demandé ne correspond à aucune fiche connue."}
    </p>

    <div class="mt-8 flex justify-center gap-3">
        <Button href={resolve( "/" )} color="primary">Retour à l'accueil</Button>
        <Button href={resolve( "/wiki" )} color="alternative">Parcourir l'encyclopédie</Button>
    </div>
</section>
