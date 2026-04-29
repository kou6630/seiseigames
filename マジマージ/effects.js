const effects = [];

export function addMergePopEffect(item) {
    effects.push({
        item,
        startTime: performance.now(),
        duration: 220
    });
}

export function getItemEffectScale(item) {
    const now = performance.now();
    let scale = 1;

    for (let i = effects.length - 1; i >= 0; i--) {
        const effect = effects[i];
        const progress = (now - effect.startTime) / effect.duration;

        if (progress >= 1) {
            effects.splice(i, 1);
            continue;
        }

        if (effect.item === item) {
            if (progress < 0.35) {
                scale = 1 - progress * 0.35;
            } else {
                const bounceProgress = (progress - 0.35) / 0.65;
                scale = 0.88 + Math.sin(bounceProgress * Math.PI) * 0.22;
            }
        }
    }

    return scale;
}

