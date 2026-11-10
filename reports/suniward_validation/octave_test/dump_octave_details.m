pkg load image;
rawDir = 'D:/Stego/dataset/raw/BOSSbase';
outDir = 'D:/Stego/reports/suniward_validation/octave_test';

for idx = [1, 2]
    coverPath = fullfile(rawDir, sprintf('%d.pgm', idx));
    cover = double(imread(coverPath));
    [k, l] = size(cover);
    
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
    R_all = cell(3, 1);
    xi_raw = cell(3, 1);
    xi_shifted = cell(3, 1);
    
    for fIndex = 1:3
        R = conv2(coverPadded, F{fIndex}, 'same');
        R_all{fIndex} = R;
        suit = conv2(1./(abs(R)+sgm), rot90(abs(F{fIndex}), 2), 'same');
        xi_raw{fIndex} = suit;
        if mod(size(F{fIndex}, 1), 2) == 0, suit = circshift(suit, [1, 0]); end;
        if mod(size(F{fIndex}, 2), 2) == 0, suit = circshift(suit, [0, 1]); end;
        xi_shifted{fIndex} = suit;
        xi{fIndex} = suit(((size(suit, 1)-k)/2)+1:end-((size(suit, 1)-k)/2), ((size(suit, 2)-l)/2)+1:end-((size(suit, 2)-l)/2));
    end
    
    rho = xi{1} + xi{2} + xi{3};
    rho(rho > wetCost) = wetCost;
    rho(isnan(rho)) = wetCost;
    rhoP1 = rho;
    rhoM1 = rho;
    rhoP1(cover==255) = wetCost;
    rhoM1(cover==0) = wetCost;
    
    F1 = F{1}; F2 = F{2}; F3 = F{3};
    xi1 = xi{1}; xi2 = xi{2}; xi3 = xi{3};
    R1 = R_all{1}; R2 = R_all{2}; R3 = R_all{3};
    raw1 = xi_raw{1}; raw2 = xi_raw{2}; raw3 = xi_raw{3};
    shift1 = xi_shifted{1}; shift2 = xi_shifted{2}; shift3 = xi_shifted{3};
    
    matPath = fullfile(outDir, sprintf('%d_octave_detail.mat', idx));
    save('-v7', matPath, 'cover', 'coverPadded', 'F1', 'F2', 'F3', ...
         'R1', 'R2', 'R3', 'raw1', 'raw2', 'raw3', ...
         'shift1', 'shift2', 'shift3', 'xi1', 'xi2', 'xi3', ...
         'rho', 'rhoP1', 'rhoM1');
    fprintf('Saved detail mat for image %d to %s\n', idx, matPath);
end

