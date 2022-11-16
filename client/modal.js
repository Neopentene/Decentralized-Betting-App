"use strict";

function clamp(value = 0, min = 0, max = 0) {
  return value <= min ? min : value > max ? max : value;
}

const getPoints = (clientX = 0, clientY = 0, boundingBox, radius = 0) => {
  const x = clientX - (boundingBox.left + boundingBox.width / 2);
  const y = clientY - (boundingBox.top + boundingBox.height / 2);
  const angle = Math.atan(y / x);
  const X = Math.cos(angle) * radius;
  const Y = Math.sin(angle) * radius;
  return {
    x: clamp(x, -Math.abs(X), Math.abs(X)),
    y: clamp(y, -Math.abs(Y), Math.abs(Y)),
  };
};

function openModal(
  overlayId = "",
  header = "",
  body = "",
  footer = "",
  isForm = false,
  onSubmit = () => {}
) {
  let overlay = document.createElement("div");

  let src = document.getElementById("placeholder-img").getAttribute("src");

  overlay.scrollTo({ top: 0 });

  overlay.id = overlayId;
  overlay.classList = "modal-overlay d-flex a-f-cen modal-fadeIn";
  overlay.innerHTML = `
        <${isForm ? "form" : "div"} id="${overlayId}-form" class="modal">
            <div class="modal-header">${header}</div>
            <div class="modal-body">${body}</div>
            <div class="modal-footer">${footer}</div>
            <div class="modal-close-wrapper d-flex a-f-cen">
                <div id="modal-close-${overlayId}" class="modal-close">
                    <img src="${src ? src : "close.svg"}" alt="" srcset="">
                </div>
            </div>
        </${isForm ? "form" : "div"}>
    `;
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeModal(overlay);
  });

  document.body.appendChild(overlay);
  addEvents(overlay);

  if (isForm) {
    document
      .getElementById(`${overlayId}-form`)
      .addEventListener("submit", (event) => {
        event.preventDefault();
        onSubmit();
      });
  }
}

function closeModal(overlay = document.createElement("div")) {
  if (!overlay.classList.replace("modal-fadeIn", "modal-fadeOut"))
    overlay.classList.add("modal-fadeOut");

  setTimeout(() => {
    document.body.removeChild(overlay);
  }, 200);
}

const addEvents = (element = document.createElement("div")) => {
  const closeButton = document.getElementById(`modal-close-${element.id}`);
  element.addEventListener("mousemove", (event) => {
    const boundingCircle = getPoints(
      event.clientX,
      event.clientY,
      closeButton.parentElement.getBoundingClientRect(),
      closeButton.clientWidth * (1 / 4)
    );

    closeButton.style.transform = `translate(${boundingCircle.x}px, ${boundingCircle.y}px)`;
  });
  element.addEventListener(
    "touchmove",
    (event) => {
      event.preventDefault();
      const boundingCircle = getPoints(
        event.touches[0].clientX,
        event.touches[0].clientY,
        closeButton.parentElement.getBoundingClientRect(),
        closeButton.clientWidth * (1 / 4)
      );
      closeButton.style.transform = `translate(${boundingCircle.x}px, ${boundingCircle.y}px)`;
    },
    { passive: false }
  );
  closeButton.addEventListener("click", () => {
    closeModal(element);
  });
};

export { openModal, closeModal, clamp };
