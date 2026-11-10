classdef RandStream < handle
    properties
        Seed = 0;
        Type = '';
    end
    methods
        function obj = RandStream(varargin)
            if nargin >= 3
                obj.Type = varargin{1};
                obj.Seed = varargin{3};
            elseif nargin >= 1
                obj.Type = varargin{1};
            end
        end
    end
    methods (Static)
        function setGlobalStream(stream)
            if isa(stream, 'RandStream')
                seed = mod(round(stream.Seed), 2^31 - 1);
                if seed == 0
                    seed = 1;
                end
                rand('state', seed);
            end
        end
    end
end
