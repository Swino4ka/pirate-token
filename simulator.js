"use strict";

const Treasure = (() => {
  const loot = [
    {id: "outfit", name: "Weekly Gold Outfit", skip: "Gold Outfit", odds: 1562500, color: "#ffd175", image: "https://static0.gamerantimages.com/wordpress/wp-content/uploads/wm/2026/11/how-to-get-solid-gold-miku-for-free-in-fortnite.jpg?w=1600&h=1600&fit=crop"},
    {id: "token", name: "Pirate Shop Access", skip: "Pirate Token", odds: 137500, color: "#ffbd67", image: "https://games.gg/cdn-cgi/image/width=1920,quality=75,format=auto,fit=scale-down,metadata=none,onerror=redirect/https://assets.games.gg/uploaded_image_fallback_739c5d56fd_beeaba7a0f.webp"},
    {id: "vehicle", name: "Weekly Vehicle & Decal", skip: "Car Decal", odds: 7813, color: "#ed9ddd", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSfNMEjGj9YpYS94uvBfybXLHP87Mt3Y9MR3plv3XcKjSmLNVU2tJ8WTnzQ&s=10"},
    {id: "pickaxe", name: "Weekly Pickaxe or Backbling", skip: "Pickaxe / Backbling", odds: 568, color: "#c0a1ff", image: "https://fortnite.gg/img/items/25262/icon.jpg?1"},
    {id: "track", name: "Weekly Jam Track", skip: "Jam Track", odds: 391, color: "#86b6ff", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSnjpEeQdjQSXbWiJHSVfnCCbv1mXObGRoOkN0asFukLt9jCJCeOfTtHJfm&s=10"},
    {id: "screen", name: "Weekly Loading Screen", skip: "Loading Screen", odds: 272, color: "#79dce9", image: "https://fortnite.gg/img/items/25091/icon.png?1"},
    {id: "gizmo", name: "Gizmo (any)", skip: "Sprite Gizmo", odds: 127, color: "#87e1bb", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR4jQLSV-y4R2Um9OVktrDg6MrcziKUEaVKxgApXPemzQ&s=10"},
  ];

  function fresh() {
    return {opened: 0, items: Object.fromEntries(loot.map(({id}) => [id, {count: 0, first: null}]))};
  }

  function probabilities(multiplier) {
    return loot.map(({odds}) => Math.min(1, multiplier / odds));
  }

  function open(stats, chances, skip, limit, stopOnDrop, random = Math.random) {
    const drops = new Array(loot.length).fill(0);
    let opened = 0;
    let match = -1;
    while (opened < limit && match === -1) {
      opened++;
      stats.opened++;
      for (let index = 0; index < loot.length; index++) {
        if (random() >= chances[index]) continue;
        const item = stats.items[loot[index].id];
        item.count++;
        item.first ??= stats.opened;
        drops[index]++;
        if (stopOnDrop && !skip.has(loot[index].id) && match === -1) match = index;
      }
    }
    return {opened, drops, match};
  }

  return {loot, fresh, probabilities, open};
})();
