pkg load image;
addpath('D:/Stego/reports/suniward_validation/octave_test');
addpath('D:/Stego/dataset/algorithms/S-UNIWARD/matlab/matlab');

rawDir = 'D:/Stego/dataset/raw/BOSSbase';
outDir = 'D:/Stego/reports/suniward_validation/octave_test';
payload = 0.4;
indices = [1, 2];

results = cell(length(indices), 1);

for i = 1:length(indices)
    idx = indices(i);
    coverPath = fullfile(rawDir, sprintf('%d.pgm', idx));
    fprintf('=== Processing BOSSbase Image %d.pgm ===\n', idx);
    
    cover = double(imread(coverPath));
    [k, l] = size(cover);
    N = numel(cover);
    
    t0 = tic;
    stego = S_UNIWARD(coverPath, payload);
    elapsedTime = toc(t0);
    
    diff = stego - cover;
    absDiff = abs(diff);
    maxAbsDiff = max(absDiff(:));
    totalChanges = sum(diff(:) ~= 0);
    plusChanges = sum(diff(:) == 1);
    minusChanges = sum(diff(:) == -1);
    changeRate = totalChanges / N;
    
    outPath = fullfile(outDir, sprintf('%d_stego_octave.pgm', idx));
    imwrite(uint8(stego), outPath);
    fprintf('Saved Octave stego to %s\n', outPath);
    
    % Now compute intermediate distortion costs to get exact numerical statistics
    sgm = 10*eps;
    hpdf = [-0.0544158422, 0.3128715909, -0.6756307363, 0.5853546837, 0.0158291053, -0.2840155430, -0.0004724846, 0.1287474266, 0.0173693010, -0.0440882539, ...
            -0.0139810279, 0.0087460940, 0.0048703530, -0.0003917404, -0.0006754494, -0.0001174768];
    lpdf = (-1).^(0:numel(hpdf)-1).*fliplr(hpdf);
    F{1} = lpdf'*hpdf;
    F{2} = hpdf'*lpdf;
    F{3} = hpdf'*hpdf;
    wetCost = 10^8;
    padSize = max([size(F{1})'; size(F{2})'; size(F{3})']);
    coverPadded = padarray(cover, [padSize padSize], 'symmetric');
    xi = cell(3, 1);
    for fIndex = 1:3
        R = conv2(coverPadded, F{fIndex}, 'same');
        xi{fIndex} = conv2(1./(abs(R)+sgm), rot90(abs(F{fIndex}), 2), 'same');
        if mod(size(F{fIndex}, 1), 2) == 0, xi{fIndex} = circshift(xi{fIndex}, [1, 0]); end;
        if mod(size(F{fIndex}, 2), 2) == 0, xi{fIndex} = circshift(xi{fIndex}, [0, 1]); end;
        xi{fIndex} = xi{fIndex}(((size(xi{fIndex}, 1)-k)/2)+1:end-((size(xi{fIndex}, 1)-k)/2), ((size(xi{fIndex}, 2)-l)/2)+1:end-((size(xi{fIndex}, 2)-l)/2));
    end
    rho = xi{1} + xi{2} + xi{3};
    rho(rho > wetCost) = wetCost;
    rho(isnan(rho)) = wetCost;
    rhoP1 = rho;
    rhoM1 = rho;
    rhoP1(cover==255) = wetCost;
    rhoM1(cover==0) = wetCost;
    
    rhoFinite = rho(rho < wetCost);
    minCost = min(rhoFinite);
    maxCost = max(rhoFinite);
    meanCost = mean(rhoFinite);
    medianCost = median(rhoFinite);
    boundary255 = sum(cover(:) == 255);
    boundary0 = sum(cover(:) == 0);
    wetP1 = sum(rhoP1(:) >= wetCost);
    wetM1 = sum(rhoM1(:) >= wetCost);
    
    % Lambda binary search
    m = payload * N;
    l3 = 1e+3;
    m3 = double(m + 1);
    it = 0;
    while m3 > m
        l3 = l3 * 2;
        pP1 = (exp(-l3 .* rhoP1))./(1 + exp(-l3 .* rhoP1) + exp(-l3 .* rhoM1));
        pM1 = (exp(-l3 .* rhoM1))./(1 + exp(-l3 .* rhoP1) + exp(-l3 .* rhoM1));
        p0 = 1 - pP1 - pM1;
        P = [p0(:); pP1(:); pM1(:)];
        H = -((P).*log2(P));
        H((P<eps) | (P > 1-eps)) = 0;
        m3 = sum(H);
        it = it + 1;
        if (it > 10)
            break;
        end
    end
    l1 = 0;
    m1 = double(N);
    lambda = 0;
    alpha = double(m)/N;
    while (double(m1-m3)/N > alpha/1000.0) && (it < 30)
        lambda = l1 + (l3-l1)/2;
        pP1 = (exp(-lambda .* rhoP1))./(1 + exp(-lambda .* rhoP1) + exp(-lambda .* rhoM1));
        pM1 = (exp(-lambda .* rhoM1))./(1 + exp(-lambda .* rhoP1) + exp(-lambda .* rhoM1));
        p0 = 1 - pP1 - pM1;
        P = [p0(:); pP1(:); pM1(:)];
        H = -((P).*log2(P));
        H((P<eps) | (P > 1-eps)) = 0;
        m2 = sum(H);
        if m2 < m
            l3 = lambda;
            m3 = m2;
        else
            l1 = lambda;
            m1 = m2;
        end
        it = it + 1;
    end
    
    pP1 = (exp(-lambda .* rhoP1))./(1 + exp(-lambda .* rhoP1) + exp(-lambda .* rhoM1));
    pM1 = (exp(-lambda .* rhoM1))./(1 + exp(-lambda .* rhoP1) + exp(-lambda .* rhoM1));
    p0 = 1 - pP1 - pM1;
    P = [p0(:); pP1(:); pM1(:)];
    H = -((P).*log2(P));
    H((P<eps) | (P > 1-eps)) = 0;
    achievedEntropy = sum(H);
    achievedPayloadBpp = achievedEntropy / N;
    expectedChangeRate = mean(pP1(:) + pM1(:));
    
    fprintf('  Elapsed: %.2f s\n', elapsedTime);
    fprintf('  Lambda: %.6f\n', lambda);
    fprintf('  Achieved Entropy: %.6f bpp (%.2f bits)\n', achievedPayloadBpp, achievedEntropy);
    fprintf('  Expected Change Rate: %.4f (%.1f%%)\n', expectedChangeRate, expectedChangeRate*100);
    fprintf('  Actual Change Rate: %.4f (%d pixels)\n', changeRate, totalChanges);
    fprintf('  +1 Changes: %d, -1 Changes: %d, Max Abs Diff: %d\n', plusChanges, minusChanges, maxAbsDiff);
    fprintf('  Cost min/median/max: %.4f / %.4f / %.2f\n', minCost, medianCost, maxCost);
    
    % Save cost and probability fields for comparison
    save(fullfile(outDir, sprintf('%d_octave_stats.mat', idx)), ...
         'minCost', 'maxCost', 'meanCost', 'medianCost', 'lambda', ...
         'achievedEntropy', 'achievedPayloadBpp', 'expectedChangeRate', ...
         'totalChanges', 'plusChanges', 'minusChanges', 'changeRate', ...
         'maxAbsDiff', 'elapsedTime', 'boundary255', 'boundary0', 'wetP1', 'wetM1');
end

fprintf('\n=== ALL OCTAVE VALIDATION RUNS COMPLETE ===\n');

