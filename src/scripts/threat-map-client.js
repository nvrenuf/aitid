const regionNodes = [...document.querySelectorAll('[data-region-node]')];
const regionDetails = [...document.querySelectorAll('[data-region-detail]')];

function setActiveRegion(regionKey) {
  regionNodes.forEach((node) => {
    const isActive = node.dataset.regionNode === regionKey;
    node.classList.toggle('active', isActive);
    node.setAttribute('aria-pressed', String(isActive));
  });

  regionDetails.forEach((detail) => {
    detail.classList.toggle('active', detail.dataset.regionDetail === regionKey);
  });
}

regionNodes.forEach((node) => {
  node.addEventListener('click', () => setActiveRegion(node.dataset.regionNode));
});
