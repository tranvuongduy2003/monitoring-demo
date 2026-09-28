using Microsoft.EntityFrameworkCore;
using MonitoringDemo.ApiService.Domain.Entities;
using MonitoringDemo.ApiService.Infrastructure.Persistence;
using MonitoringDemo.ApiService.Infrastructure.Telemetry;

namespace MonitoringDemo.ApiService.Features.Products;

public interface IProductService
{
    Task<IReadOnlyList<Product>> GetAllAsync(CancellationToken cancellationToken);
    Task<Product?> FindAsync(int id, CancellationToken cancellationToken);
}

public sealed class ProductService : IProductService
{
    private readonly AppDbContext _dbContext;
    private readonly AppActivitySource _activitySource;

    public ProductService(AppDbContext dbContext, AppActivitySource activitySource)
    {
        _dbContext = dbContext;
        _activitySource = activitySource;
    }

    public async Task<IReadOnlyList<Product>> GetAllAsync(CancellationToken cancellationToken)
    {
        using var activity = _activitySource.Source.StartActivity("GetProducts");
        var products = await _dbContext.Products
            .AsNoTracking()
            .OrderBy(product => product.Id)
            .ToListAsync(cancellationToken);
        activity?.SetTag("products.count", products.Count);
        return products;
    }

    public Task<Product?> FindAsync(int id, CancellationToken cancellationToken) =>
        _dbContext.Products
            .AsNoTracking()
            .SingleOrDefaultAsync(product => product.Id == id, cancellationToken);
}
